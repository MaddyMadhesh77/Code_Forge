import { createHash, randomBytes } from "node:crypto";
import type { ParticipantRole, SessionStatus } from "@prisma/client";

import type { CreateInterviewDto, CreateSessionLinkDto, JoinInterviewDto } from "./dto/index.js";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../common/errors/app-error.js";
import { PrismaService } from "../../database/prisma.service.js";

const DEFAULT_LINK_TTL_SECONDS = 24 * 60 * 60;
const MAX_LINK_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * Hashes an invite token for storage. Join links are bearer credentials, so
 * only the digest is persisted — the raw token is returned once, at creation.
 */
function hashLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class InterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createInterview(userId: string, data: CreateInterviewDto) {
    if (!data.problemId) {
      throw new BadRequestError("A problemId is required", undefined, "MISSING_PROBLEM");
    }

    const problem = await this.prisma.problem.findUnique({
      where: { id: data.problemId },
      select: { id: true },
    });

    if (!problem) {
      throw new NotFoundError("Problem", "PROBLEM_NOT_FOUND");
    }

    // Session, participant, problem link and recording are created together —
    // a failure partway through must not leave a session with no interviewer.
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.interviewSession.create({
        data: {
          title: data.title,
          creatorId: userId,
          templateId: data.templateId ?? null,
          role: data.role ?? null,
          level: data.level ?? null,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
          participants: { create: { userId, role: "INTERVIEWER" } },
          problems: { create: { problemId: data.problemId as string, ordinal: 0 } },
        },
        include: { participants: true, problems: true },
      });

      await tx.interviewRecording.create({ data: { sessionId: session.id } });

      return session;
    });
  }

  getInterview(sessionId: string) {
    return this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        participants: {
          include: {
            user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
          },
        },
        problems: { include: { problem: true } },
        submissions: true,
      },
    });
  }

  listInterviews(userId: string, limit = 10, offset = 0) {
    return this.prisma.interviewSession.findMany({
      where: { participants: { some: { userId } } },
      include: { participants: true, problems: true },
      take: Math.min(Math.max(limit, 1), 100),
      skip: Math.max(offset, 0),
      orderBy: { createdAt: "desc" },
    });
  }

  async updateInterviewStatus(sessionId: string, status: string) {
    const allowed: SessionStatus[] = ["SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"];

    if (!allowed.includes(status as SessionStatus)) {
      throw new BadRequestError(`Invalid status: ${status}`, undefined, "INVALID_STATUS");
    }

    return this.prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: status as SessionStatus,
        startedAt: status === "ACTIVE" ? new Date() : undefined,
        endedAt: status === "COMPLETED" || status === "CANCELLED" ? new Date() : undefined,
      },
    });
  }

  /**
   * Issues a join link. Returns the raw token exactly once; only its digest is
   * stored, so a database dump cannot be replayed to join interviews.
   */
  async createSessionLink(sessionId: string, userId: string, data: CreateSessionLinkDto) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { participants: true },
    });

    if (!session) {
      throw new NotFoundError("Session", "SESSION_NOT_FOUND");
    }

    const isAuthorized =
      session.creatorId === userId ||
      session.participants.some(
        (participant) => participant.userId === userId && participant.role === "INTERVIEWER",
      );

    if (!isAuthorized) {
      throw new ForbiddenError("Only an interviewer can create session links");
    }

    const token = randomBytes(32).toString("base64url");
    const ttlSeconds = Math.min(
      Math.max(data.expiresIn ?? DEFAULT_LINK_TTL_SECONDS, 60),
      MAX_LINK_TTL_SECONDS,
    );

    const link = await this.prisma.sessionLink.create({
      data: {
        sessionId,
        role: (data.role ?? "CANDIDATE") as ParticipantRole,
        tokenHash: hashLinkToken(token),
        // Links always expire; an unbounded invite is a standing back door.
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
        createdById: userId,
        maxUses: 1,
      },
    });

    return { ...link, token };
  }

  /** Redeems a join link and adds the caller as a participant. */
  async joinSession(data: JoinInterviewDto, userId: string) {
    if (!data.token) {
      throw new BadRequestError("A join token is required", undefined, "MISSING_TOKEN");
    }

    const link = await this.prisma.sessionLink.findUnique({
      where: { tokenHash: hashLinkToken(data.token) },
      include: { session: true },
    });

    if (!link) {
      throw new UnauthorizedError("Invalid join link", "INVALID_LINK");
    }

    if (link.revokedAt) {
      throw new UnauthorizedError("This link has been revoked", "LINK_REVOKED");
    }

    if (link.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError("This link has expired", "LINK_EXPIRED");
    }

    const existing = await this.prisma.sessionParticipant.findUnique({
      where: { sessionId_userId: { sessionId: link.sessionId, userId } },
    });

    // Re-joining with a link you already redeemed is fine and does not consume
    // another use.
    if (existing) {
      return link.session;
    }

    if (link.useCount >= link.maxUses) {
      throw new ConflictError("This link has already been used", "LINK_EXHAUSTED");
    }

    return this.prisma.$transaction(async (tx) => {
      // Conditional increment: two simultaneous redemptions cannot both pass.
      const claimed = await tx.sessionLink.updateMany({
        where: { id: link.id, useCount: { lt: link.maxUses }, revokedAt: null },
        data: { useCount: { increment: 1 }, usedAt: new Date() },
      });

      if (claimed.count === 0) {
        throw new ConflictError("This link has already been used", "LINK_EXHAUSTED");
      }

      await tx.sessionParticipant.create({
        data: { sessionId: link.sessionId, userId, role: link.role },
      });

      return link.session;
    });
  }

  async revokeSessionLink(linkId: string, userId: string) {
    const link = await this.prisma.sessionLink.findUnique({
      where: { id: linkId },
      include: { session: { select: { creatorId: true } } },
    });

    if (!link) {
      throw new NotFoundError("Session link", "LINK_NOT_FOUND");
    }

    if (link.session.creatorId !== userId && link.createdById !== userId) {
      throw new ForbiddenError("Not authorized to revoke this link");
    }

    return this.prisma.sessionLink.update({
      where: { id: linkId },
      data: { revokedAt: new Date() },
    });
  }

  async getSessionLinks(sessionId: string, userId: string) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      select: { creatorId: true },
    });

    if (!session) {
      throw new NotFoundError("Session", "SESSION_NOT_FOUND");
    }

    if (session.creatorId !== userId) {
      throw new ForbiddenError("Only the session creator can list its links");
    }

    // `tokenHash` is deliberately not selected — it must never leave the server.
    return this.prisma.sessionLink.findMany({
      where: { sessionId },
      select: {
        id: true,
        sessionId: true,
        role: true,
        expiresAt: true,
        revokedAt: true,
        usedAt: true,
        useCount: true,
        maxUses: true,
        createdById: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  endSession(sessionId: string) {
    return this.updateInterviewStatus(sessionId, "COMPLETED");
  }
}
