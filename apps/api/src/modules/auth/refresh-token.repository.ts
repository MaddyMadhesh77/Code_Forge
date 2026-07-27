import { createHash } from "node:crypto";

import { PrismaService } from "../../database/prisma.service.js";

export type StoredRefreshToken = {
  id: string;
  jti: string;
  userId: string;
  family: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

/**
 * Refresh tokens are stored as SHA-256 digests. A digest is sufficient here
 * (unlike a password) because the token is high-entropy random data, and it
 * means a dump of this table cannot be replayed against the API.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async issue(input: {
    token: string;
    jti: string;
    userId: string;
    family: string;
    expiresAt: Date;
  }): Promise<StoredRefreshToken> {
    return this.prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(input.token),
        jti: input.jti,
        userId: input.userId,
        family: input.family,
        expiresAt: input.expiresAt,
      },
      select: { id: true, jti: true, userId: true, family: true, expiresAt: true, revokedAt: true },
    });
  }

  async findByToken(token: string): Promise<StoredRefreshToken | null> {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, jti: true, userId: true, family: true, expiresAt: true, revokedAt: true },
    });
  }

  async revokeById(id: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revokes every token in a rotation family. Called both on normal rotation
   * and on reuse detection, where an already-revoked token being presented
   * means the family is compromised.
   */
  async revokeFamily(family: string): Promise<number> {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return count;
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return count;
  }

  /** Housekeeping: drop rows that are long past use. */
  async deleteExpired(before: Date = new Date()): Promise<number> {
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: before } },
    });

    return count;
  }
}
