import type { Prisma } from "@prisma/client";

import type { CreateScorecardDto } from "./dto/index.js";
import { NotFoundError } from "../../common/errors/app-error.js";
import { PrismaService } from "../../database/prisma.service.js";

export type RubricScores = {
  problemSolving: number;
  communication: number;
  debugging: number;
  codeQuality: number;
  timeManagement: number;
  testingApproach: number;
};

export type ScorecardReport = {
  sessionId: string;
  totalInterviewers: number;
  scorecards: Array<{
    id: string;
    authorId: string;
    candidateId: string | null;
    scores: RubricScores;
    overall: number;
    feedback: string;
    submittedAt: string;
  }>;
  averageScores: RubricScores | null;
  highestRatedCriteria: string | null;
  lowestRatedCriteria: string | null;
};

const RUBRIC_KEYS: Array<keyof RubricScores> = [
  "problemSolving",
  "communication",
  "debugging",
  "codeQuality",
  "timeManagement",
  "testingApproach",
];

/**
 * Interviewer scorecards, backed by the single `Scorecard` table.
 *
 * Submitting twice revises the existing scorecard rather than failing on the
 * unique constraint, which is what an interviewer editing their notes expects.
 */
export class ScorecardService {
  constructor(private readonly prisma: PrismaService) {}

  async createScorecard(
    sessionId: string,
    interviewerId: string,
    candidateId: string | null,
    data: CreateScorecardDto,
  ) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });

    if (!session) {
      throw new NotFoundError("Interview session", "SESSION_NOT_FOUND");
    }

    const scores = toScores(data);
    const overall = data.overallRating ?? meanOf(scores);

    return this.prisma.scorecard.upsert({
      where: { sessionId_authorId: { sessionId, authorId: interviewerId } },
      create: {
        sessionId,
        authorId: interviewerId,
        candidateId,
        scores: scores as unknown as Prisma.InputJsonValue,
        overall,
        feedback: data.feedback ?? "",
      },
      update: {
        scores: scores as unknown as Prisma.InputJsonValue,
        overall,
        feedback: data.feedback ?? "",
      },
    });
  }

  getScorecard(sessionId: string, interviewerId: string) {
    return this.prisma.scorecard.findUnique({
      where: { sessionId_authorId: { sessionId, authorId: interviewerId } },
    });
  }

  getAllScorecards(sessionId: string) {
    return this.prisma.scorecard.findMany({
      where: { sessionId },
      orderBy: { submittedAt: "asc" },
    });
  }

  updateScorecard(sessionId: string, interviewerId: string, data: CreateScorecardDto) {
    return this.createScorecard(sessionId, interviewerId, null, data);
  }

  async calculateAverageScores(sessionId: string): Promise<RubricScores | null> {
    const scorecards = await this.getAllScorecards(sessionId);

    if (scorecards.length === 0) {
      return null;
    }

    const totals = Object.fromEntries(RUBRIC_KEYS.map((key) => [key, 0])) as RubricScores;

    for (const scorecard of scorecards) {
      const scores = (scorecard.scores as Partial<RubricScores> | null) ?? {};

      for (const key of RUBRIC_KEYS) {
        // Only count keys actually present, so a missing dimension does not
        // drag an average toward zero.
        const value = scores[key];
        totals[key] += typeof value === "number" ? value : 0;
      }
    }

    for (const key of RUBRIC_KEYS) {
      totals[key] = Number((totals[key] / scorecards.length).toFixed(2));
    }

    return totals;
  }

  async generateScorecardReport(sessionId: string): Promise<ScorecardReport> {
    const [scorecards, averageScores] = await Promise.all([
      this.getAllScorecards(sessionId),
      this.calculateAverageScores(sessionId),
    ]);

    return {
      sessionId,
      totalInterviewers: scorecards.length,
      scorecards: scorecards.map((scorecard) => ({
        id: scorecard.id,
        authorId: scorecard.authorId,
        candidateId: scorecard.candidateId,
        scores: (scorecard.scores as RubricScores | null) ?? emptyScores(),
        overall: scorecard.overall,
        feedback: scorecard.feedback,
        submittedAt: scorecard.submittedAt.toISOString(),
      })),
      averageScores,
      highestRatedCriteria: extremeCriteria(averageScores, "max"),
      lowestRatedCriteria: extremeCriteria(averageScores, "min"),
    };
  }
}

function toScores(data: CreateScorecardDto): RubricScores {
  return {
    problemSolving: data.problemSolving,
    communication: data.communication,
    debugging: data.debugging,
    codeQuality: data.codeQuality,
    timeManagement: data.timeManagement,
    testingApproach: data.testingApproach,
  };
}

/** Rounded mean of the rubric dimensions, used when no overall rating is given. */
function meanOf(scores: RubricScores): number {
  const values = Object.values(scores);
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function emptyScores(): RubricScores {
  return Object.fromEntries(RUBRIC_KEYS.map((key) => [key, 0])) as RubricScores;
}

function extremeCriteria(scores: RubricScores | null, mode: "max" | "min"): string | null {
  if (!scores) {
    return null;
  }

  const entries = Object.entries(scores);

  if (entries.length === 0) {
    return null;
  }

  return entries.reduce((best, current) =>
    mode === "max"
      ? current[1] > best[1]
        ? current
        : best
      : current[1] < best[1]
        ? current
        : best,
  )[0];
}
