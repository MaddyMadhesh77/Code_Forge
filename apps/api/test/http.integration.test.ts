import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { createApp } from "../src/server/http.server.js";
import { hashPassword } from "../src/common/crypto/password.js";

/**
 * Exercises the assembled Express application over real HTTP.
 *
 * These are the regression tests for the reported vulnerabilities: the
 * path traversal on the audit endpoint, the Bearer header that authenticated
 * anyone, and the routes that had no authorization at all.
 */
let app: AppModule;
let server: Server;
let baseUrl: string;

const password = "integration-test-password";
const emails = {
  candidate: `http-candidate-${Date.now()}@codeforge.test`,
  admin: `http-admin-${Date.now()}@codeforge.test`,
};

const tokens: Record<"candidate" | "admin", string> = { candidate: "", admin: "" };
const userIds: string[] = [];

async function request(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<{ status: number; body: any }> {
  const { token, ...rest } = init;

  const response = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers: {
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(rest.headers ?? {}),
    },
  });

  const text = await response.text();

  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return { status: response.status, body };
}

beforeAll(async () => {
  app = new AppModule();
  await app.init();

  const passwordHash = await hashPassword(password);

  for (const [role, email] of [
    ["CANDIDATE", emails.candidate],
    ["ADMIN", emails.admin],
  ] as const) {
    const user = await app.database.prisma.user.upsert({
      where: { email },
      create: { email, displayName: `HTTP ${role}`, passwordHash, role },
      update: {},
    });
    userIds.push(user.id);
  }

  const expressApp = createApp(app);
  server = await new Promise<Server>((resolve) => {
    // Port 0 asks the OS for a free port, so tests never collide with a dev server.
    const instance = expressApp.listen(0, () => resolve(instance));
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;

  for (const key of ["candidate", "admin"] as const) {
    const login = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: emails[key], password }),
    });
    tokens[key] = login.body.tokens.accessToken;
  }
}, 60_000);

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));

  if (userIds.length > 0) {
    await app.database.prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  await app.shutdown();
});

describe("health", () => {
  it("reports liveness without touching the database", async () => {
    const response = await request("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("reports readiness including a real database check", async () => {
    const response = await request("/ready");
    expect(response.status).toBe(200);
    expect(response.body.checks.database.connected).toBe(true);
  });
});

describe("authentication", () => {
  it("rejects an arbitrary Bearer token", async () => {
    // Previously any Bearer header authenticated the caller as user_123.
    const response = await request("/api/auth/me", { token: "totally-made-up" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBeDefined();
  });

  it("rejects a request with no Authorization header", async () => {
    expect((await request("/api/auth/me")).status).toBe(401);
  });

  it("accepts a genuine token", async () => {
    const response = await request("/api/auth/me", { token: tokens.admin });

    expect(response.status).toBe(200);
    expect(response.body.email).toBe(emails.admin);
  });

  it("rejects bad credentials without revealing which part was wrong", async () => {
    const response = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: emails.admin, password: "wrong-password-here" }),
    });

    expect(response.status).toBe(401);
    expect(JSON.stringify(response.body)).not.toMatch(/password hash|scrypt/i);
  });
});

describe("authorization", () => {
  const adminOnly = ["/operator/dlq", "/api/webhooks"];

  it.each(adminOnly)("refuses %s to a candidate", async (path) => {
    expect((await request(path, { token: tokens.candidate })).status).toBe(403);
  });

  it.each(adminOnly)("refuses %s to an anonymous caller", async (path) => {
    expect((await request(path)).status).toBe(401);
  });

  it("refuses problem creation to a candidate", async () => {
    const response = await request("/api/problems", {
      method: "POST",
      token: tokens.candidate,
      body: JSON.stringify({ title: "Nope", description: "Nope", difficulty: "EASY" }),
    });

    expect(response.status).toBe(403);
  });
});

describe("audit endpoint path traversal", () => {
  const payloads = [
    "..%2f..%2fetc%2fpasswd",
    "%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "....%2f%2f....%2f%2fetc%2fpasswd",
    "%2fetc%2fpasswd",
  ];

  it.each(payloads)("refuses to read %s even as an admin", async (payload) => {
    const response = await request(`/operator/audit/${payload}`, { token: tokens.admin });

    // Rejected as invalid input, never a 200 with file contents.
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(response.body)).not.toMatch(/root:x:/);
  });

  it("still serves a well-formed tenant id", async () => {
    const response = await request("/operator/audit/unknown", { token: tokens.admin });

    // 200 when the log exists, 404 when it does not — both prove the handler
    // ran rather than rejecting a legitimate tenant.
    expect([200, 404]).toContain(response.status);
  });
});

describe("request validation", () => {
  it("rejects a malformed registration with per-field detail", async () => {
    const response = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email", password: "x", displayName: "" }),
    });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
    expect(Array.isArray(response.body.error.details)).toBe(true);
  });

  it("rejects a malformed JSON body", async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });

    expect(response.status).toBe(400);
  });

  it("returns a consistent error envelope for unknown routes", async () => {
    const response = await request("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
  });
});

describe("security headers", () => {
  it("sets hardening headers and hides the framework", async () => {
    const response = await fetch(`${baseUrl}/health`);

    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(response.headers.get("x-powered-by")).toBeNull();
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });

  it("does not echo CORS headers for an origin outside the allowlist", async () => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: { Origin: "https://evil.example.com" },
    });

    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });
});
