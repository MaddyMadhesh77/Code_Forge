import type { Request } from "express";
import { describe, expect, it, vi } from "vitest";

import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { requireRoles } from "./roles.guard.js";
import { WsAuthGuard, type SocketLike } from "./ws-auth.guard.js";
import { issueToken } from "../crypto/jwt.js";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error.js";
import { loadConfig } from "../../config/env.js";

const config = loadConfig({
  ...process.env,
  NODE_ENV: "test",
  JWT_ACCESS_SECRET: "guard-test-access-secret-0123456789abcdef",
  JWT_REFRESH_SECRET: "guard-test-refresh-secret-abcdef0123456789",
});

function accessTokenFor(subject: string, role: string): string {
  return issueToken(
    { subject, role, type: "access" },
    {
      secret: config.jwt.accessSecret,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      expiresInSeconds: 900,
    },
  ).token;
}

function requestWith(authorization?: string): Request {
  return { headers: authorization ? { authorization } : {} } as Request;
}

describe("JwtAuthGuard", () => {
  const guard = new JwtAuthGuard(config);

  it("authenticates a valid bearer token", () => {
    const user = guard.authenticate(requestWith(`Bearer ${accessTokenFor("user-9", "INTERVIEWER")}`));

    expect(user.id).toBe("user-9");
    expect(user.role).toBe("INTERVIEWER");
  });

  it("rejects an arbitrary bearer value", () => {
    // The previous OIDC middleware accepted any Bearer header and attached a
    // hardcoded user_123.
    expect(() => guard.authenticate(requestWith("Bearer anything-at-all"))).toThrow(
      UnauthorizedError,
    );
    expect(() => guard.authenticate(requestWith("Bearer a.b.c"))).toThrow(UnauthorizedError);
  });

  it("rejects a missing or malformed header", () => {
    expect(() => guard.authenticate(requestWith())).toThrow(UnauthorizedError);
    expect(() => guard.authenticate(requestWith("Basic dXNlcjpwYXNz"))).toThrow(UnauthorizedError);
    expect(() => guard.authenticate(requestWith("Bearer"))).toThrow(UnauthorizedError);
  });

  it("never yields a hardcoded identity", () => {
    try {
      guard.authenticate(requestWith("Bearer forged.token.value"));
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as UnauthorizedError).status).toBe(401);
    }
  });

  it("middleware attaches req.user and calls next once", () => {
    const req = requestWith(`Bearer ${accessTokenFor("user-3", "ADMIN")}`);
    const next = vi.fn();

    guard.canActivate()(req, {} as never, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ id: "user-3", role: "ADMIN" });
  });

  it("optional() allows anonymous requests through", () => {
    const req = requestWith();
    const next = vi.fn();

    guard.optional()(req, {} as never, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeUndefined();
  });
});

describe("RolesGuard", () => {
  function run(role: string | undefined, allowed: Parameters<typeof requireRoles>) {
    const req = (role ? { user: { id: "u", role, tokenId: "t" } } : {}) as Request;
    const next = vi.fn();
    requireRoles(...allowed)(req, {} as never, next);
    return next.mock.calls[0][0];
  }

  it("admits the exact role", () => {
    expect(run("ADMIN", ["ADMIN"])).toBeUndefined();
  });

  it("admits a higher role via the hierarchy", () => {
    expect(run("ADMIN", ["INTERVIEWER"])).toBeUndefined();
    expect(run("INTERVIEWER", ["CANDIDATE"])).toBeUndefined();
  });

  it("refuses a lower role", () => {
    expect(run("CANDIDATE", ["INTERVIEWER"])).toBeInstanceOf(ForbiddenError);
    expect(run("INTERVIEWER", ["ADMIN"])).toBeInstanceOf(ForbiddenError);
  });

  it("fails closed on an unauthenticated request", () => {
    expect(run(undefined, ["CANDIDATE"])).toBeInstanceOf(UnauthorizedError);
  });

  it("refuses an unrecognised role", () => {
    expect(run("SUPERUSER", ["CANDIDATE"])).toBeInstanceOf(ForbiddenError);
  });
});

describe("WsAuthGuard", () => {
  const guard = new WsAuthGuard(config);

  function socket(auth?: Record<string, unknown>): SocketLike {
    return { id: "socket-1", handshake: { auth } };
  }

  it("authenticates a token from the handshake", () => {
    const user = guard.authenticate(socket({ token: accessTokenFor("user-7", "CANDIDATE") }));

    expect(user?.id).toBe("user-7");
  });

  it("returns null for a missing or invalid token", () => {
    expect(guard.authenticate(socket())).toBeNull();
    expect(guard.authenticate(socket({ token: "garbage" }))).toBeNull();
  });

  it("middleware rejects an unauthenticated connection", () => {
    const next = vi.fn();
    guard.middleware()(socket(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it("middleware stores the principal on socket.data", () => {
    const client = socket({ token: accessTokenFor("user-4", "ADMIN") });
    const next = vi.fn();

    guard.middleware()(client, next);

    expect(next).toHaveBeenCalledWith();
    expect(WsAuthGuard.currentUser(client)?.id).toBe("user-4");
  });
});
