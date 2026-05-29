import Bull from 'bull';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export class QueueModule {
  queue: Bull.Queue;
  dlq: Bull.Queue;

  constructor() {
    this.queue = new Bull('jobs', REDIS_URL, {
      defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
    });
    this.dlq = new Bull('jobs-dlq', REDIS_URL);

    this.queue.on('failed', async (job) => {
      const attempts = (job.opts && (job.opts as any).attempts) || 0;
      if (job.attemptsMade >= attempts) {
        try {
          await this.dlq.add(job.data, { attempts: 0 });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to enqueue DLQ', e);
        }
      }
    });
  }
}

