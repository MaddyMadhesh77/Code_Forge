import type { ParticipantRole, Prisma, SessionStatus } from "@prisma/client";

import { ConflictError, NotFoundError } from "../../common/errors/app-error.js";
import { isNotFound, PrismaService } from "../../database/prisma.service.js";
import type { Paginated } from "../users/users.repository.js";

export type SessionParticipantRecord = {
  id: string;
  sessionId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: string;
  displayName?: string;
};

export type SessionRecord = {
  id: string;
  title: string;
  creatorId: string;
  creatorName?: string;
  status: SessionStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  participants: SessionParticipantRecord[];
  problemIds: string[];
};

export type CreateSessionInput = {
  title: string;
  creatorId: string;
  scheduledAt?: string | Date | null;
  problemIds?: string[];
};

export type ListSessionsOptions = {
  limit?: number;
  offset?: number;
  status?: SessionStatus;
  /** Restricts results to sessions the user created or participates in. */
  viewerId?: string;
};

const MAX_PAGE_SIZE = 100;

const SESSION_INCLUDE = {
  creator: { select: { displayName: true } },
  participants: {
    orderBy: { joinedAt: "asc" },
    include: { user: { select: { displayName: true } } },
  },
  problems: { orderBy: { ordinal: "asc" }, select: { problemId: true } },
} satisfies Prisma.InterviewSessionInclude;

type SessionRow = Prisma.InterviewSessionGetPayload<{ include: typeof SESSION_INCLUDE }>;

function toRecord(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    title: row.title,
    creatorId: row.creatorId,
    creatorName: row.creator?.displayName,
    status: row.status,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    participants: row.participants.map((participant) => ({
      id: participant.id,
      sessionId: participant.sessionId,
      userId: participant.userId,
      role: participant.role,
      joinedAt: participant.joinedAt.toISOString(),
      displayName: participant.user?.displayName,
    })),
    problemIds: row.problems.map((problem) => problem.problemId),
  };
}

/**
 * Persistent interview sessions. Previously a module-level array, so every
 * scheduled and in-progress interview vanished on restart.
 */
export class SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateSessionInput): Promise<SessionRecord> {
    const row = await this.prisma.interviewSession.create({
      data: {
        title: input.title,
        creatorId: input.creatorId,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        ...(input.problemIds?.length
          ? {
              problems: {
                create: input.problemIds.map((problemId, ordinal) => ({ problemId, ordinal })),
              },
            }
          : {}),
      },
      include: SESSION_INCLUDE,
    });

    return toRecord(row);
  }

  async list(options: ListSessionsOptions = {}): Promise<Paginated<SessionRecord>> {
    const limit = Math.min(Math.max(options.limit ?? 25, 1), MAX_PAGE_SIZE);
    const offset = Math.max(options.offset ?? 0, 0);

    const where: Prisma.InterviewSessionWhereInput = {
      ...(options.status ? { status: options.status } : {}),
      ...(options.viewerId
        ? {
            OR: [
              { creatorId: options.viewerId },
              { participants: { some: { userId: options.viewerId } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.interviewSession.findMany({
        where,
        include: SESSION_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.interviewSession.count({ where }),
    ]);

    return { items: rows.map(toRecord), total, limit, offset };
  }

  async getById(sessionId: string): Promise<SessionRecord | null> {
    const row = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: SESSION_INCLUDE,
    });

    return row ? toRecord(row) : null;
  }

  async requireById(sessionId: string): Promise<SessionRecord> {
    const session = await this.getById(sessionId);

    if (!session) {
      throw new NotFoundError("Session", "SESSION_NOT_FOUND");
    }

    return session;
  }

  /** Idempotent join: re-joining returns the existing participant row. */
  async join(
    sessionId: string,
    userId: string,
    role: ParticipantRole,
  ): Promise<SessionParticipantRecord> {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      select: { id: true, status: true },
    });

    if (!session) {
      throw new NotFoundError("Session", "SESSION_NOT_FOUND");
    }

    if (session.status === "COMPLETED" || session.status === "CANCELLED") {
      throw new ConflictError("This session has already ended", "SESSION_ENDED");
    }

    const participant = await this.prisma.sessionParticipant.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      create: { sessionId, userId, role },
      update: {},
      include: { user: { select: { displayName: true } } },
    });

    return {
      id: participant.id,
      sessionId: participant.sessionId,
      userId: participant.userId,
      role: participant.role,
      joinedAt: participant.joinedAt.toISOString(),
      displayName: participant.user?.displayName,
    };
  }

  async attachProblem(sessionId: string, problemId: string): Promise<SessionRecord> {
    const ordinal = await this.prisma.interviewSessionProblem.count({ where: { sessionId } });

    await this.prisma.interviewSessionProblem.upsert({
      where: { sessionId_problemId: { sessionId, problemId } },
      create: { sessionId, problemId, ordinal },
      update: {},
    });

    return this.requireById(sessionId);
  }

  async updateStatus(sessionId: string, status: SessionStatus): Promise<SessionRecord> {
    try {
      const row = await this.prisma.interviewSession.update({
        where: { id: sessionId },
        data: {
          status,
          // Stamp the lifecycle timestamps as the status advances.
          ...(status === "ACTIVE" ? { startedAt: new Date() } : {}),
          ...(status === "COMPLETED" || status === "CANCELLED" ? { endedAt: new Date() } : {}),
        },
        include: SESSION_INCLUDE,
      });

      return toRecord(row);
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundError("Session", "SESSION_NOT_FOUND");
      }
      throw error;
    }
  }

  /** Persists the collaborative editor snapshot so a restart is recoverable. */
  async saveSnapshot(sessionId: string, snapshot: Uint8Array | string): Promise<void> {
    const bytes = typeof snapshot === "string" ? Buffer.from(snapshot, "utf8") : Buffer.from(snapshot);

    try {
      await this.prisma.interviewSession.update({
        where: { id: sessionId },
        data: { yjsSnapshot: bytes },
      });
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundError("Session", "SESSION_NOT_FOUND");
      }
      throw error;
    }
  }

  async loadSnapshot(sessionId: string): Promise<Buffer | null> {
    const row = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      select: { yjsSnapshot: true },
    });

    return row?.yjsSnapshot ? Buffer.from(row.yjsSnapshot) : null;
  }

  /** True when the user created the session or is a participant in it. */
  async isMember(sessionId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.interviewSession.count({
      where: {
        id: sessionId,
        OR: [{ creatorId: userId }, { participants: { some: { userId } } }],
      },
    });

    return count > 0;
  }
}
