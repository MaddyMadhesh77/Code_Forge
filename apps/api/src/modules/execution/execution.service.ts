import {
  submitCodeSchema,
  type QueuedSubmission,
  type SubmitCodeInput,
} from "../../../../../packages/shared/src/schemas/execution.schema.js";
import type { ExecutionQueueJob, ExecutionResultEvent } from "../../../../../packages/shared/src/schemas/queue.schema.js";
import { executionBus } from "../../../../../packages/shared/src/runtime/execution-bus.js";
import {
  InMemoryExecutionQueue,
  type ExecutionQueuePort,
} from "./execution.queue.js";
import { ExecutionResultStore } from "./execution.result.store.js";

export class ExecutionService {
  constructor(
    private readonly queue: ExecutionQueuePort = new InMemoryExecutionQueue(),
    private readonly resultStore = new ExecutionResultStore(),
  ) {}

  enqueue(input: unknown): QueuedSubmission {
    const payload = submitCodeSchema.parse(input);

    const queued = this.queue.enqueue(payload satisfies SubmitCodeInput);
    this.resultStore.setSubmissionSession(queued.submissionId, queued.sessionId);
    return queued;
  }

  listQueued(): QueuedSubmission[] {
    return this.queue.getAll();
  }

  pullNextJob(): ExecutionQueueJob | undefined {
    return this.queue.pullNextJob();
  }

  queueBackend() {
    return this.queue.backend();
  }

  ingestWorkerResults() {
    const events = executionBus.drainResults();

    for (const event of events) {
      this.resultStore.saveResult(event.result);
    }

    return events;
  }

  getResult(submissionId: string) {
    return this.resultStore.getResult(submissionId);
  }

  listResults() {
    return this.resultStore.listResults();
  }

  getSubmissionSession(submissionId: string) {
    return this.resultStore.getSubmissionSession(submissionId);
  }
}
