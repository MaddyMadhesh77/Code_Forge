import Bull from "bull";

import { logger } from "../../common/logging/logger.js";
import { getConfig, type AppConfig } from "../../config/env.js";

const log = logger.child("QueueModule");

/**
 * Bull queues plus a dead-letter queue for jobs that exhaust their retries.
 *
 * Redis connection errors are logged rather than left to surface as unhandled
 * `error` events, which would crash the process.
 */
export class QueueModule {
  readonly queue: Bull.Queue;
  readonly dlq: Bull.Queue;

  constructor(redisUrl: string) {
    this.queue = new Bull("jobs", redisUrl, {
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 1000 } },
    });
    this.dlq = new Bull("jobs-dlq", redisUrl);

    this.queue.on("failed", (job) => {
      void this.routeToDeadLetter(job);
    });

    // Bull emits 'error' on connection trouble; an unhandled one is fatal.
    this.queue.on("error", (err) => log.error("Queue error", { err }));
    this.dlq.on("error", (err) => log.error("Dead-letter queue error", { err }));
  }

  /** Returns null when Redis is not configured, so the API can still boot. */
  static createIfConfigured(config: AppConfig = getConfig()): QueueModule | null {
    if (!config.redisUrl) {
      log.warn("REDIS_URL is not set; queue features are disabled");
      return null;
    }

    return new QueueModule(config.redisUrl);
  }

  private async routeToDeadLetter(job: Bull.Job): Promise<void> {
    const attempts = job.opts?.attempts ?? 0;

    if (job.attemptsMade < attempts) {
      return;
    }

    try {
      await this.dlq.add(job.data, { attempts: 0 });
      log.warn("Job moved to dead-letter queue", {
        jobId: job.id,
        attemptsMade: job.attemptsMade,
        failedReason: (job as { failedReason?: string }).failedReason,
      });
    } catch (err) {
      log.error("Failed to enqueue job to dead-letter queue", { jobId: job.id, err });
    }
  }

  async close(): Promise<void> {
    await Promise.allSettled([this.queue.close(), this.dlq.close()]);
  }
}
