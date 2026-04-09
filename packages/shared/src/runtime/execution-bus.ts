import type { ExecutionResultEvent, ExecutionQueueJob } from "../schemas/queue.schema.js";

class InMemoryExecutionBus {
  private readonly jobs: ExecutionQueueJob[] = [];
  private readonly results: ExecutionResultEvent[] = [];

  enqueue(job: ExecutionQueueJob) {
    this.jobs.push(job);
  }

  dequeue(): ExecutionQueueJob | undefined {
    return this.jobs.shift();
  }

  pendingJobs(): ExecutionQueueJob[] {
    return [...this.jobs];
  }

  publish(result: ExecutionResultEvent) {
    this.results.push(result);
  }

  listResults(): ExecutionResultEvent[] {
    return [...this.results];
  }

  drainResults(): ExecutionResultEvent[] {
    const drained = [...this.results];
    this.results.length = 0;
    return drained;
  }
}

export const executionBus = new InMemoryExecutionBus();
