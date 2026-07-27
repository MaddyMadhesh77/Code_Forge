import { randomUUID } from "node:crypto";

import {
  loginSchema,
  registerSchema,
  type AuthSession,
  type AuthTokens,
  type AuthUser,
} from "@codeforge/shared";

import { RefreshTokenRepository } from "./refresh-token.repository.js";
import type { UsersRepository } from "../users/users.repository.js";
import { getConfig, type AppConfig } from "../../config/env.js";
import { issueToken, JwtError, verifyToken } from "../../common/crypto/jwt.js";
import { hashPassword, needsRehash, verifyPassword } from "../../common/crypto/password.js";
import { ForbiddenError, UnauthorizedError } from "../../common/errors/app-error.js";
import { logger } from "../../common/logging/logger.js";
import { parseWith } from "../../common/validation/parse.js";

const log = logger.child("AuthService");

/**
 * A real hash of an unguessable value, used to equalise timing on
 * unknown-email logins. Without it a missing user returns measurably faster
 * than a wrong password, which leaks which emails are registered.
 *
 * Derived once at startup so it uses the same cost parameters as live hashes.
 */
const timingDecoyHash = hashPassword(randomUUID() + randomUUID());

export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly config: AppConfig = getConfig(),
  ) {}

  async register(input: unknown): Promise<AuthSession> {
    const payload = parseWith(registerSchema, input);

    // The repository enforces uniqueness at the database level, so two
    // concurrent registrations cannot both succeed.
    const user = await this.users.create({
      email: payload.email,
      displayName: payload.displayName,
      passwordHash: await hashPassword(payload.password),
      role: "CANDIDATE",
    });

    log.info("User registered", { userId: user.id });

    return { user: toAuthUser(user), tokens: await this.issueTokenPair(user, randomUUID()) };
  }

  async login(input: unknown): Promise<AuthSession> {
    const payload = parseWith(loginSchema, input);
    const user = await this.users.getByEmailWithSecret(payload.email);

    // Always run a verification, even when the user does not exist, so the
    // response time does not reveal which emails are registered.
    const matches = await verifyPassword(
      payload.password,
      user?.passwordHash ?? (await timingDecoyHash),
    );

    if (!user || !matches) {
      throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");
    }

    if (!user.isActive) {
      throw new ForbiddenError("This account has been deactivated", "ACCOUNT_DEACTIVATED");
    }

    // Opportunistically upgrade hashes that predate the current cost factor.
    if (needsRehash(user.passwordHash)) {
      await this.users
        .updatePasswordHash(user.id, await hashPassword(payload.password))
        .catch((err) => log.warn("Password rehash failed", { userId: user.id, err }));
    }

    return { user: toAuthUser(user), tokens: await this.issueTokenPair(user, randomUUID()) };
  }

  /**
   * Rotates a refresh token. The presented token is verified as a JWT *and*
   * looked up in the database, so revocation takes effect immediately rather
   * than waiting for the token to expire.
   */
  async refresh(refreshToken: unknown): Promise<AuthTokens> {
    let claims;

    try {
      claims = verifyToken(refreshToken, {
        secret: this.config.jwt.refreshSecret,
        issuer: this.config.jwt.issuer,
        audience: this.config.jwt.audience,
        expectedType: "refresh",
      });
    } catch (error) {
      throw new UnauthorizedError(
        error instanceof JwtError ? "Invalid refresh token" : "Invalid refresh token",
        "INVALID_REFRESH_TOKEN",
      );
    }

    const stored = await this.refreshTokens.findByToken(refreshToken as string);

    if (!stored) {
      throw new UnauthorizedError("Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }

    // Reuse detection: a revoked token being presented means either a replay or
    // a stolen token. Kill the whole family so the attacker's copy dies too.
    if (stored.revokedAt) {
      const revoked = await this.refreshTokens.revokeFamily(stored.family);
      log.warn("Refresh token reuse detected; revoked family", {
        userId: stored.userId,
        family: stored.family,
        revoked,
      });
      throw new UnauthorizedError("Refresh token has been revoked", "REFRESH_TOKEN_REUSED");
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError("Refresh token has expired", "REFRESH_TOKEN_EXPIRED");
    }

    const user = await this.users.getById(stored.userId);

    if (!user) {
      throw new UnauthorizedError("Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }

    if (!user.isActive) {
      await this.refreshTokens.revokeAllForUser(user.id);
      throw new ForbiddenError("This account has been deactivated", "ACCOUNT_DEACTIVATED");
    }

    await this.refreshTokens.revokeById(stored.id);

    // Same family: lets us trace and revoke a whole login lineage at once.
    return this.issueTokenPair(user, stored.family);
  }

  async revoke(refreshToken: unknown): Promise<boolean> {
    if (typeof refreshToken !== "string" || refreshToken.length === 0) {
      return false;
    }

    const stored = await this.refreshTokens.findByToken(refreshToken);

    if (!stored) {
      return false;
    }

    await this.refreshTokens.revokeFamily(stored.family);
    return true;
  }

  async revokeAllSessions(userId: string): Promise<number> {
    return this.refreshTokens.revokeAllForUser(userId);
  }

  async me(userId: string): Promise<AuthUser | null> {
    const user = await this.users.getById(userId);
    return user ? toAuthUser(user) : null;
  }

  private async issueTokenPair(
    user: { id: string; role: AuthUser["role"] },
    family: string,
  ): Promise<AuthTokens> {
    const { jwt } = this.config;

    const access = issueToken(
      { subject: user.id, role: user.role, type: "access" },
      {
        secret: jwt.accessSecret,
        issuer: jwt.issuer,
        audience: jwt.audience,
        expiresInSeconds: jwt.accessTtlSeconds,
      },
    );

    const refresh = issueToken(
      { subject: user.id, role: user.role, type: "refresh", family },
      {
        secret: jwt.refreshSecret,
        issuer: jwt.issuer,
        audience: jwt.audience,
        expiresInSeconds: jwt.refreshTtlSeconds,
      },
    );

    await this.refreshTokens.issue({
      token: refresh.token,
      jti: refresh.payload.jti,
      userId: user.id,
      family,
      expiresAt: new Date(refresh.payload.exp * 1000),
    });

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      expiresInSeconds: jwt.accessTtlSeconds,
    };
  }
}

function toAuthUser(user: {
  id: string;
  email: string;
  displayName: string;
  role: AuthUser["role"];
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}
