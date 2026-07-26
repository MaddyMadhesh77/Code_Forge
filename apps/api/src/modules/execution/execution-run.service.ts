import {
  ExecutionRunRepository,
  type ExecutionRunRecord,
  type TestOutcome,
} from "./execution-run.repository.js";
import { ExecutionService } from "./execution.service.js";
import { ForbiddenError } from "../../common/errors/app-error.js";
import type { AuthenticatedUser } from "../../common/guards/jwt-auth.guard.js";
import { logger } from "../../common/logging/logger.js";
import { ProblemsRepository } from "../problems/problems.repository.js";
import { SessionsRepository } from "../sessions/sessions.repository.js";

const log = logger.child("ExecutionRun");

export type StartRunInput = {
  problemId: string;
  language: string;
  code: string;
  sessionId?: string;
};

/**
 * Owns the lifecycle of a code-execution run: validate the request, persist a
 * RUNNING row, hand the work to the queue, and record the outcome.
 *
 * Runs are durable, so a client polling `GET /runs/:id` still gets an answer
 * after an API restart, and a second replica can serve the poll.
 */
export class ExecutionRunService {
  constructor(
    private readonly runs: ExecutionRunRepository,
    private readonly execution: ExecutionService,
    private readonly problems: ProblemsRepository,
    private readonly sessions: SessionsRepository,
  ) {}

  async startRun(actor: AuthenticatedUser, input: StartRunInput): Promise<ExecutionRunRecord> {
    // Resolve through the repository so an unknown problem 404s here rather
    // than surfacing as a foreign-key error from the database.
    const problem = await this.problems.requireByIdOrSlug(input.problemId);

    if (input.sessionId && !(await this.sessions.isMember(input.sessionId, actor.id))) {
      throw new ForbiddenError("You are not a participant in this session");
    }

    const queued = this.execution.enqueue({
      problemId: problem.id,
      language: input.language,
      code: input.code,
      sessionId: input.sessionId,
    });

    const run = await this.runs.create({
      userId: actor.id,
      problemId: problem.id,
      sessionId: input.sessionId ?? null,
      language: input.language,
      code: input.code,
      submissionId: queued.submissionId,
    });

    log.info("Execution run started", {
      runId: run.runId,
      problemId: problem.id,
      userId: actor.id,
    });

    return run;
  }

  async getRun(actor: AuthenticatedUser, runId: string): Promise<ExecutionRunRecord> {
    const run = await this.runs.requireById(runId);

    // Before this, any caller who knew a run id could read another
    // candidate's stdout and code.
    const permitted =
      actor.role === "ADMIN" ||
      (await this.runs.isOwnedBy(runId, actor.id)) ||
      (run.sessionId ? await this.sessions.isMember(run.sessionId, actor.id) : false);

    if (!permitted) {
      throw new ForbiddenError("You do not have access to this run");
    }

    return run;
  }

  /**
   * Drains worker results and writes them to the matching run rows. Called by
   * the sync endpoint and the background poller.
   */
  async ingestResults(): Promise<number> {
    const events = this.execution.ingestWorkerResults();
    let applied = 0;

    for (const event of events) {
      const run = await this.runs.findBySubmissionId(event.result.submissionId);

      if (!run) {
        log.warn("Received a result for an unknown submission", {
          submissionId: event.result.submissionId,
        });
        continue;
      }

      await this.runs.complete(run.runId, {
        status: event.result.verdict === "INTERNAL_ERROR" ? "FAILED" : "COMPLETED",
        stdout: event.result.stdout ?? "",
        stderr: event.result.stderr ?? "",
        tests: toTestOutcomes(event.result),
        runtimeMs: event.result.runtimeMs ?? null,
        memoryKb: event.result.memoryKb ?? null,
      });

      applied += 1;
    }

    return applied;
  }

  /** Fails runs orphaned by a crash, so clients stop polling them forever. */
  async reconcileStaleRuns(maxAgeMs = 10 * 60 * 1000): Promise<number> {
    const count = await this.runs.failStaleRuns(new Date(Date.now() - maxAgeMs));

    if (count > 0) {
      log.warn("Marked stale execution runs as failed", { count });
    }

    return count;
  }
}

function toTestOutcomes(result: {
  testResults?: Array<{ name?: string; passed?: boolean; runtimeMs?: number; message?: string }>;
}): TestOutcome[] {
  return (result.testResults ?? []).map((test, index) => ({
    id: `t${index + 1}`,
    name: test.name ?? `Test ${index + 1}`,
    status: test.passed ? "PASSED" : "FAILED",
    ...(test.runtimeMs !== undefined ? { runtimeMs: test.runtimeMs } : {}),
    ...(test.message !== undefined ? { message: test.message } : {}),
  }));
}
