import { logger } from "../logging/logger.js";

const log = logger.child("Scheduler");

export type IntervalJobOptions = {
  name: string;
  intervalMs: number;
  /** Run once immediately instead of waiting a full interval. */
  runOnStart?: boolean;
  task: () => Promise<unknown>;
};

/**
 * A recurring background job with real error handling.
 *
 * The pattern this replaces was `setInterval(() => job().catch(() => {}))`,
 * which discarded every failure. Here failures are logged with context and
 * counted, overlapping runs are prevented, and the handle can be stopped so
 * the process can exit cleanly.
 */
export class IntervalJob {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private consecutiveFailures = 0;

  constructor(private readonly options: IntervalJobOptions) {}

  start(): this {
    if (this.timer) {
      return this;
    }

    this.timer = setInterval(() => void this.runOnce(), this.options.intervalMs);
    // Do not hold the event loop open purely for this timer.
    this.timer.unref?.();

    if (this.options.runOnStart) {
      void this.runOnce();
    }

    log.info("Scheduled job started", {
      job: this.options.name,
      intervalMs: this.options.intervalMs,
    });

    return this;
  }

  /**
   * Executes the task, guarding against overlap. A slow run must not have a
   * second copy started on top of it.
   */
  async runOnce(): Promise<void> {
    if (this.running) {
      log.warn("Skipping run; previous invocation still in progress", {
        job: this.options.name,
      });
      return;
    }

    this.running = true;
    const startedAt = Date.now();

    try {
      await this.options.task();
      this.consecutiveFailures = 0;
      log.debug("Scheduled job completed", {
        job: this.options.name,
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      this.consecutiveFailures += 1;
      log.error("Scheduled job failed", {
        job: this.options.name,
        consecutiveFailures: this.consecutiveFailures,
        durationMs: Date.now() - startedAt,
        err,
      });
    } finally {
      this.running = false;
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      log.info("Scheduled job stopped", { job: this.options.name });
    }
  }

  get failureCount(): number {
    return this.consecutiveFailures;
  }
}
