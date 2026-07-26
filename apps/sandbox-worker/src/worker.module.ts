import { executionBus, type ExecutionResult } from '@codeforge/shared';

/**
 * Development stand-in for the sandbox worker.
 *
 * It returns a fixed ACCEPTED verdict rather than executing anything — real
 * execution belongs in an isolated container governed by `ResourceCaps`
 * (see `services/resource-caps.service.ts` for the cgroup/Docker limits and
 * the enforcement loop). The return type is the shared `ExecutionResult`, so
 * this stub cannot drift from the contract the API consumes.
 */
export class WorkerModule {
  drainOnce(): ExecutionResult | null {
    const job = executionBus.dequeue();

    if (!job) {
      return null;
    }

    const result: ExecutionResult = {
      submissionId: job.submission.submissionId,
      verdict: 'ACCEPTED',
      runtimeMs: 12,
      memoryKb: 2048,
      stdout: '',
      stderr: '',
      testResults: [
        {
          name: 'Sample 1',
          input: 'sample',
          expected: 'sample',
          actual: 'sample',
          passed: true,
          runtimeMs: 12,
        },
      ],
      executedAt: new Date().toISOString(),
    };

    executionBus.publish({
      jobId: job.jobId,
      completedAt: new Date().toISOString(),
      result,
    });

    return result;
  }
}
