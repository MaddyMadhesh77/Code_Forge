import type { QueuedSubmission, SubmitCodeInput } from "../../../../../packages/shared/src/schemas/execution.schema.js";
import type { ExecutionQueueJob } from "../../../../../packages/shared/src/schemas/queue.schema.js";
import { executionBus } from "../../../../../packages/shared/src/runtime/execution-bus.js";

export interface ExecutionQueuePort {
  enqueue(input: SubmitCodeInput): QueuedSubmission;
  getAll(): QueuedSubmission[];
  pullNextJob(): ExecutionQueueJob | undefined;
  backend(): "in-memory" | "bullmq";
}

export class InMemoryExecutionQueue implements ExecutionQueuePort {
  private readonly jobs: ExecutionQueueJob[] = [];

  backend() {
    return "in-memory" as const;
  }

  enqueue(input: SubmitCodeInput): QueuedSubmission {
    const submission: QueuedSubmission = {
      ...input,
      submissionId: `submission_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      status: "queued",
      queuedAt: new Date().toISOString(),
    };

    const job: ExecutionQueueJob = {
      jobId: `job_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      enqueuedAt: new Date().toISOString(),
      submission,
    };

    this.jobs.push(job);
    return submission;
  }

  getAll(): QueuedSubmission[] {
    return this.jobs.map((job) => job.submission);
  }

  pullNextJob(): ExecutionQueueJob | undefined {
    return this.jobs.shift();
  }
}

export class BullMqExecutionQueue implements ExecutionQueuePort {
  private readonly submissions: QueuedSubmission[] = [];

  backend() {
    return "bullmq" as const;
  }

  enqueue(input: SubmitCodeInput): QueuedSubmission {
    const submission: QueuedSubmission = {
      ...input,
      submissionId: `submission_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      status: "queued",
      queuedAt: new Date().toISOString(),
    };

    const job: ExecutionQueueJob = {
      jobId: `job_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      enqueuedAt: new Date().toISOString(),
      submission,
    };

    executionBus.enqueue(job);
    this.submissions.push(submission);
    return submission;
  }

  getAll(): QueuedSubmission[] {
    return [...this.submissions];
  }

  pullNextJob(): ExecutionQueueJob | undefined {
    return executionBus.dequeue();
  }
}
