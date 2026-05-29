import { executionBus } from '../../../packages/shared/src/runtime/execution-bus.js';

export class WorkerModule {
  drainOnce() {
    const job = executionBus.dequeue();
    if (!job) {
      return null;
    }

    const result = {
      submissionId: job.submission.submissionId,
      verdict: 'ACCEPTED',
      runtimeMs: 12,
      memoryKb: 2048,
      stdout: '',
      stderr: '',
      testResults: [
        {
          input: 'sample',
          expected: 'sample',
          actual: 'sample',
          passed: true,
        },
      ],
      executedAt: new Date().toISOString(),
    };

    executionBus.publish({
      type: 'execution-result',
      result,
    });

    return result;
  }
}
