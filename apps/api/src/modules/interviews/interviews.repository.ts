import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { NotFoundError } from "../../common/errors/app-error.js";
import { isNotFound, PrismaService } from "../../database/prisma.service.js";

export type ScorecardRecord = {
  id: string;
  sessionId: string;
  authorId: string;
  scores: Record<string, number>;
  overall: number;
  recommendation: string;
  feedback: string;
  submittedAt: string;
  updatedAt: string;
};

export type NoteRecord = {
  id: string;
  sessionId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export type ReportRecord = {
  id: string;
  sessionId: string;
  summary: string;
  content: Record<string, unknown>;
  shareToken: string | null;
  shareExpiry: string | null;
  generatedAt: string;
};

/**
 * Durable storage for interview artifacts — scorecards, notes and reports.
 * These were previously in-process Maps, so a restart erased every rating an
 * interviewer had recorded.
 */
export class InterviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- Scorecards -------------------------------------------------------

  /**
   * One scorecard per interviewer per session; submitting again revises the
   * existing one rather than silently creating a duplicate.
   */
  async upsertScorecard(input: {
    sessionId: string;
    authorId: string;
    scores: Record<string, number>;
    overall: number;
    recommendation: string;
    feedback: string;
  }): Promise<ScorecardRecord> {
    const row = await this.prisma.scorecard.upsert({
      where: { sessionId_authorId: { sessionId: input.sessionId, authorId: input.authorId } },
      create: {
        sessionId: input.sessionId,
        authorId: input.authorId,
        scores: input.scores as Prisma.InputJsonValue,
        overall: input.overall,
        recommendation: input.recommendation,
        feedback: input.feedback,
      },
      update: {
        scores: input.scores as Prisma.InputJsonValue,
        overall: input.overall,
        recommendation: input.recommendation,
        feedback: input.feedback,
      },
    });

    return this.toScorecard(row);
  }

  async listScorecards(sessionId: string): Promise<ScorecardRecord[]> {
    const rows = await this.prisma.scorecard.findMany({
      where: { sessionId },
      orderBy: { submittedAt: "asc" },
    });

    return rows.map((row) => this.toScorecard(row));
  }

  async getScorecard(sessionId: string, authorId: string): Promise<ScorecardRecord | null> {
    const row = await this.prisma.scorecard.findUnique({
      where: { sessionId_authorId: { sessionId, authorId } },
    });

    return row ? this.toScorecard(row) : null;
  }

  private toScorecard(row: {
    id: string;
    sessionId: string;
    authorId: string;
    scores: Prisma.JsonValue;
    overall: number;
    recommendation: string;
    feedback: string;
    submittedAt: Date;
    updatedAt: Date;
  }): ScorecardRecord {
    return {
      id: row.id,
      sessionId: row.sessionId,
      authorId: row.authorId,
      scores: (row.scores as Record<string, number> | null) ?? {},
      overall: row.overall,
      recommendation: row.recommendation,
      feedback: row.feedback,
      submittedAt: row.submittedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  // --- Notes ------------------------------------------------------------

  async addNote(input: { sessionId: string; authorId: string; body: string }): Promise<NoteRecord> {
    const row = await this.prisma.interviewNote.create({ data: input });

    return {
      id: row.id,
      sessionId: row.sessionId,
      authorId: row.authorId,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async listNotes(sessionId: string, limit = 200): Promise<NoteRecord[]> {
    const rows = await this.prisma.interviewNote.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      take: Math.min(Math.max(limit, 1), 500),
    });

    return rows.map((row) => ({
      id: row.id,
      sessionId: row.sessionId,
      authorId: row.authorId,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  // --- Reports ----------------------------------------------------------

  async upsertReport(input: {
    sessionId: string;
    summary: string;
    content?: Record<string, unknown>;
  }): Promise<ReportRecord> {
    const row = await this.prisma.interviewReport.upsert({
      where: { sessionId: input.sessionId },
      create: {
        sessionId: input.sessionId,
        summary: input.summary,
        content: (input.content ?? {}) as Prisma.InputJsonValue,
      },
      update: {
        summary: input.summary,
        content: (input.content ?? {}) as Prisma.InputJsonValue,
        generatedAt: new Date(),
      },
    });

    return this.toReport(row);
  }

  async getReport(sessionId: string): Promise<ReportRecord | null> {
    const row = await this.prisma.interviewReport.findUnique({ where: { sessionId } });
    return row ? this.toReport(row) : null;
  }

  /**
   * Issues a share link backed by 32 bytes of CSPRNG output. The token is the
   * only credential for the public report view, so it must not be guessable.
   */
  async createShareLink(sessionId: string, ttlMs: number): Promise<ReportRecord> {
    try {
      const row = await this.prisma.interviewReport.update({
        where: { sessionId },
        data: {
          shareToken: randomBytes(32).toString("base64url"),
          shareExpiry: new Date(Date.now() + ttlMs),
        },
      });

      return this.toReport(row);
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundError("Report", "REPORT_NOT_FOUND");
      }
      throw error;
    }
  }

  async revokeShareLink(sessionId: string): Promise<void> {
    await this.prisma.interviewReport.updateMany({
      where: { sessionId },
      data: { shareToken: null, shareExpiry: null },
    });
  }

  /** Resolves a share token, refusing expired ones. */
  async findByShareToken(token: string): Promise<ReportRecord | null> {
    if (typeof token !== "string" || token.length < 16) {
      return null;
    }

    const row = await this.prisma.interviewReport.findUnique({ where: { shareToken: token } });

    if (!row || !row.shareExpiry || row.shareExpiry.getTime() <= Date.now()) {
      return null;
    }

    return this.toReport(row);
  }

  private toReport(row: {
    id: string;
    sessionId: string;
    summary: string;
    content: Prisma.JsonValue;
    shareToken: string | null;
    shareExpiry: Date | null;
    generatedAt: Date;
  }): ReportRecord {
    return {
      id: row.id,
      sessionId: row.sessionId,
      summary: row.summary,
      content: (row.content as Record<string, unknown> | null) ?? {},
      shareToken: row.shareToken,
      shareExpiry: row.shareExpiry?.toISOString() ?? null,
      generatedAt: row.generatedAt.toISOString(),
    };
  }
}
