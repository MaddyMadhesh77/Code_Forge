import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AuthService } from "../src/modules/auth/auth.service.js";
import { RefreshTokenRepository } from "../src/modules/auth/refresh-token.repository.js";
import { PrismaUsersRepository } from "../src/modules/users/users.prisma.repository.js";
import { verifyToken } from "../src/common/crypto/jwt.js";
import { ConflictError, ForbiddenError, UnauthorizedError } from "../src/common/errors/app-error.js";
import { loadConfig } from "../src/config/env.js";
import { PrismaService } from "../src/database/prisma.service.js";

/**
 * Auth flow against a real PostgreSQL database.
 *
 * Requires the dev database: `docker compose up -d postgres && pnpm --filter
 * @codeforge/api prisma:deploy`.
 */
const config = loadConfig(process.env);
const prisma = new PrismaService(config.databaseUrl);
const users = new PrismaUsersRepository(prisma);
const refreshTokens = new RefreshTokenRepository(prisma);
const auth = new AuthService(users, refreshTokens, config);

const createdUserIds: string[] = [];

function uniqueEmail(): string {
  return `test-${randomUUID()}@codeforge.test`;
}

async function register(email = uniqueEmail(), password = "correct-horse-battery") {
  const session = await auth.register({ email, password, displayName: "Test User" });
  createdUserIds.push(session.user.id);
  return { session, email, password };
}

beforeAll(async () => {
  await prisma.connect();
});

afterAll(async () => {
  // Cascades clean up refresh tokens.
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  await prisma.disconnect();
});

describe("registration", () => {
  it("persists the user with a hashed password, never the plaintext", async () => {
    const { session, password } = await register();

    const stored = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    expect(stored).not.toBeNull();
    expect(stored!.passwordHash).not.toContain(password);
    expect(stored!.passwordHash.startsWith("scrypt$")).toBe(true);
  });

  it("issues verifiable access and refresh tokens", async () => {
    const { session } = await register();

    const access = verifyToken(session.tokens.accessToken, {
      secret: config.jwt.accessSecret,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      expectedType: "access",
    });

    expect(access.sub).toBe(session.user.id);
    expect(access.role).toBe("CANDIDATE");
  });

  it("rejects a duplicate email at the database level", async () => {
    const { email } = await register();

    await expect(
      auth.register({ email, password: "another-password-1", displayName: "Impostor" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("treats email as case-insensitive", async () => {
    const { email } = await register();

    await expect(
      auth.register({
        email: email.toUpperCase(),
        password: "another-password-1",
        displayName: "Impostor",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects a weak password before touching the database", async () => {
    await expect(
      auth.register({ email: uniqueEmail(), password: "short", displayName: "Test" }),
    ).rejects.toThrowError(/validation/i);
  });
});

describe("login", () => {
  it("accepts correct credentials", async () => {
    const { email, password } = await register();
    const session = await auth.login({ email, password });

    expect(session.user.email).toBe(email.toLowerCase());
    expect(session.tokens.accessToken).toBeTruthy();
  });

  it("rejects a wrong password", async () => {
    const { email } = await register();

    await expect(auth.login({ email, password: "definitely-wrong-1" })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("gives the same error for unknown and wrong-password, not leaking existence", async () => {
    const { email } = await register();

    const unknown = await auth.login({ email: uniqueEmail(), password: "whatever-123" }).catch((e) => e);
    const wrong = await auth.login({ email, password: "whatever-123" }).catch((e) => e);

    expect(unknown.code).toBe(wrong.code);
    expect(unknown.message).toBe(wrong.message);
  });

  it("refuses a deactivated account", async () => {
    const { session, email, password } = await register();
    await prisma.user.update({ where: { id: session.user.id }, data: { isActive: false } });

    await expect(auth.login({ email, password })).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("refresh token rotation", () => {
  it("stores only a digest of the token", async () => {
    const { session } = await register();

    const rows = await prisma.refreshToken.findMany({
      where: { userId: session.user.id },
      select: { tokenHash: true },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(session.tokens.refreshToken);
    expect(rows[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rotates and invalidates the previous token", async () => {
    const { session } = await register();
    const rotated = await auth.refresh(session.tokens.refreshToken);

    expect(rotated.refreshToken).not.toBe(session.tokens.refreshToken);

    // The consumed token must not work a second time.
    await expect(auth.refresh(session.tokens.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("revokes the whole family when a used token is replayed", async () => {
    const { session } = await register();
    const rotated = await auth.refresh(session.tokens.refreshToken);

    // Replay the consumed token: treated as theft, so the live one dies too.
    await expect(auth.refresh(session.tokens.refreshToken)).rejects.toMatchObject({
      code: "REFRESH_TOKEN_REUSED",
    });

    await expect(auth.refresh(rotated.refreshToken)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("refuses an access token presented as a refresh token", async () => {
    const { session } = await register();

    await expect(auth.refresh(session.tokens.accessToken)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("refuses a syntactically valid but unknown token", async () => {
    await expect(auth.refresh("not.a.token")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("revokes all sessions for a user", async () => {
    const { session } = await register();
    await auth.revokeAllSessions(session.user.id);

    await expect(auth.refresh(session.tokens.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});

describe("persistence", () => {
  it("survives a new service instance, proving state is in the database", async () => {
    const { session, email, password } = await register();

    // A completely fresh object graph, as if the process had restarted.
    const freshPrisma = new PrismaService(config.databaseUrl);
    const freshAuth = new AuthService(
      new PrismaUsersRepository(freshPrisma),
      new RefreshTokenRepository(freshPrisma),
      config,
    );

    try {
      const reloaded = await freshAuth.login({ email, password });
      expect(reloaded.user.id).toBe(session.user.id);

      const me = await freshAuth.me(session.user.id);
      expect(me?.email).toBe(email.toLowerCase());
    } finally {
      await freshPrisma.disconnect();
    }
  });
});
