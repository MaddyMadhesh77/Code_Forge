import type { Prisma, RunStatus } from "@prisma/client";

import { NotFoundError } from "../../common/errors/app-error.js";
import { isNotFound, PrismaService } from "../../database/prisma.service.js";

export type TestOutcome = {
  id: string;
  name: string;
  status: "PASSED" | "FAILED";
  runtimeMs?: number;
  message?: string;
};

export type ExecutionRunRecord = {
  runId: string;
  status: RunStatus;
  language: string;
  problemId: string;
  sessionId: string | null;
  stdout: string;
  stderr: string;
  tests: TestOutcome[];
  runtimeMs: number | null;
  memoryKb: number | null;
  createdAt: string;
  completedAt: string | null;
};

export type CreateRunInput = {
  userId?: string | null;
  problemId: string;
  sessionId?: string | null;
  language: string;
  code: string;
  submissionId?: string | null;
};

export type CompleteRunInput = {
  status: Extract<RunStatus, "COMPLETED" | "FAILED" | "CANCELLED">;
  stdout?: string;
  stderr?: string;
  tests?: TestOutcome[];
  runtimeMs?: number | null;
  memoryKb?: number | null;
};

type RunRow = Prisma.ExecutionRunGetPayload<Record<string, never>>;

function toRecord(row: RunRow): ExecutionRunRecord {
  return {
    runId: row.id,
    status: row.status,
    language: row.language,
    problemId: row.problemId,
    sessionId: row.sessionId,
    stdout: row.stdout,
    stderr: row.stderr,
    tests: (row.testResults as TestOutcome[] | null) ?? [],
    runtimeMs: row.runtimeMs,
    memoryKb: row.memoryKb,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

/**
 * Durable storage for code-execution runs.
 *
 * Runs used to live in an in-process `Map`, which meant a restart lost every
 * in-flight run and a second API replica could not see the first one's results.
 */
export class ExecutionRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRunInput): Promise<ExecutionRunRecord> {
    const row = await this.prisma.executionRun.create({
      data: {
        userId: input.userId ?? null,
        problemId: input.problemId,
        sessionId: input.sessionId ?? null,
        submissionId: input.submissionId ?? null,
        language: input.language,
        code: input.code,
        status: "RUNNING",
      },
    });

    return toRecord(row);
  }

  async findById(runId: string): Promise<ExecutionRunRecord | null> {
    const row = await this.prisma.executionRun.findUnique({ where: { id: runId } });
    return row ? toRecord(row) : null;
  }

  async requireById(runId: string): Promise<ExecutionRunRecord> {
    const run = await this.findById(runId);

    if (!run) {
      throw new NotFoundError("Execution run", "RUN_NOT_FOUND");
    }

    return run;
  }

  async findBySubmissionId(submissionId: string): Promise<ExecutionRunRecord | null> {
    const row = await this.prisma.executionRun.findUnique({ where: { submissionId } });
    return row ? toRecord(row) : null;
  }

  async complete(runId: string, input: CompleteRunInput): Promise<ExecutionRunRecord> {
    try {
      const row = await this.prisma.executionRun.update({
        where: { id: runId },
        data: {
          status: input.status,
          stdout: input.stdout ?? "",
          stderr: input.stderr ?? "",
          testResults: (input.tests ?? []) as Prisma.InputJsonValue,
          runtimeMs: input.runtimeMs ?? null,
          memoryKb: input.memoryKb ?? null,
          completedAt: new Date(),
        },
      });

      return toRecord(row);
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundError("Execution run", "RUN_NOT_FOUND");
      }
      throw error;
    }
  }

  /** Ownership check used for run-level authorization. */
  async isOwnedBy(runId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.executionRun.count({ where: { id: runId, userId } });
    return count > 0;
  }

  async listForSession(sessionId: string, limit = 50): Promise<ExecutionRunRecord[]> {
    const rows = await this.prisma.executionRun.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 200),
    });

    return rows.map(toRecord);
  }

  /**
   * Marks runs abandoned mid-flight as failed. Called on startup: a run left
   * in RUNNING by a crashed process would otherwise be polled forever.
   */
  async failStaleRuns(olderThan: Date): Promise<number> {
    const { count } = await this.prisma.executionRun.updateMany({
      where: { status: { in: ["PENDING", "RUNNING"] }, createdAt: { lt: olderThan } },
      data: {
        status: "FAILED",
        stderr: "Execution did not complete; the worker was interrupted.",
        completedAt: new Date(),
      },
    });

    return count;
  }
}
