import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { issueToken, JwtError, verifyToken } from "./jwt.js";

const OPTIONS = {
  secret: "unit-test-secret-value-0123456789abcdef",
  issuer: "codeforge-api-test",
  audience: "codeforge-web-test",
  expiresInSeconds: 900,
};

const VERIFY = {
  secret: OPTIONS.secret,
  issuer: OPTIONS.issuer,
  audience: OPTIONS.audience,
};

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

describe("JWT verification", () => {
  it("round-trips a token it issued", () => {
    const { token } = issueToken({ subject: "user-1", role: "ADMIN", type: "access" }, OPTIONS);
    const claims = verifyToken(token, { ...VERIFY, expectedType: "access" });

    expect(claims.sub).toBe("user-1");
    expect(claims.role).toBe("ADMIN");
    expect(claims.typ).toBe("access");
    expect(claims.jti).toBeTruthy();
  });

  it("rejects a token signed with a different secret", () => {
    const { token } = issueToken({ subject: "user-1", role: "ADMIN", type: "access" }, OPTIONS);

    expect(() => verifyToken(token, { ...VERIFY, secret: "some-other-secret-value-9876543210" }))
      .toThrowError(expect.objectContaining({ code: "BAD_SIGNATURE" }));
  });

  it("rejects a tampered payload", () => {
    const { token } = issueToken({ subject: "user-1", role: "CANDIDATE", type: "access" }, OPTIONS);
    const [header, payload, signature] = token.split(".");

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    // Privilege escalation attempt: rewrite the role, keep the signature.
    decoded.role = "ADMIN";
    const forged = `${header}.${base64url(decoded)}.${signature}`;

    expect(() => verifyToken(forged, VERIFY)).toThrowError(
      expect.objectContaining({ code: "BAD_SIGNATURE" }),
    );
  });

  it("rejects the alg:none bypass", () => {
    const header = base64url({ alg: "none", typ: "JWT" });
    const payload = base64url({
      sub: "attacker",
      role: "ADMIN",
      typ: "access",
      iss: OPTIONS.issuer,
      aud: OPTIONS.audience,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      jti: "forged",
    });

    expect(() => verifyToken(`${header}.${payload}.`, VERIFY)).toThrowError(
      expect.objectContaining({ code: "BAD_ALGORITHM" }),
    );
  });

  it("rejects an HS256 token whose header claims another algorithm", () => {
    const header = base64url({ alg: "HS512", typ: "JWT" });
    const payload = base64url({
      sub: "attacker",
      role: "ADMIN",
      typ: "access",
      iss: OPTIONS.issuer,
      aud: OPTIONS.audience,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      jti: "forged",
    });
    const signature = createHmac("sha256", OPTIONS.secret)
      .update(`${header}.${payload}`)
      .digest("base64url");

    expect(() => verifyToken(`${header}.${payload}.${signature}`, VERIFY)).toThrowError(
      expect.objectContaining({ code: "BAD_ALGORITHM" }),
    );
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      const { token } = issueToken(
        { subject: "user-1", role: "ADMIN", type: "access" },
        { ...OPTIONS, expiresInSeconds: 60 },
      );

      // Past expiry plus the clock-skew allowance.
      vi.setSystemTime(new Date("2026-01-01T00:02:00Z"));

      expect(() => verifyToken(token, VERIFY)).toThrowError(
        expect.objectContaining({ code: "EXPIRED" }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("enforces issuer and audience", () => {
    const { token } = issueToken({ subject: "user-1", role: "ADMIN", type: "access" }, OPTIONS);

    expect(() => verifyToken(token, { ...VERIFY, issuer: "someone-else" })).toThrowError(
      expect.objectContaining({ code: "BAD_ISSUER" }),
    );
    expect(() => verifyToken(token, { ...VERIFY, audience: "another-app" })).toThrowError(
      expect.objectContaining({ code: "BAD_AUDIENCE" }),
    );
  });

  it("refuses a refresh token where an access token is required", () => {
    const { token } = issueToken(
      { subject: "user-1", role: "ADMIN", type: "refresh", family: "fam-1" },
      OPTIONS,
    );

    expect(() => verifyToken(token, { ...VERIFY, expectedType: "access" })).toThrowError(
      expect.objectContaining({ code: "BAD_TYPE" }),
    );
  });

  it("rejects structurally invalid input", () => {
    for (const bad of ["", "abc", "a.b", "a.b.c.d", null, undefined, 42, {}]) {
      expect(() => verifyToken(bad as unknown, VERIFY)).toThrowError(JwtError);
    }
  });
});
