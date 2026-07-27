import fs from "node:fs";
import path from "node:path";

import { logger } from "../common/logging/logger.js";

const log = logger.child("Retention");

export type RetentionReport = {
  scanned: number;
  deleted: string[];
  failed: Array<{ file: string; reason: string }>;
};

/**
 * Enforces the audit-log retention window by deleting files older than the
 * configured age.
 *
 * `enforce` now reports what it did and, crucially, does not swallow failures:
 * a retention job that silently fails is a compliance problem, not a cosmetic
 * one.
 */
export class RetentionService {
  readonly baseDir: string;

  constructor(
    readonly retentionDays = 90,
    baseDir?: string,
  ) {
    this.baseDir = path.resolve(baseDir ?? path.join(process.cwd(), "data", "audit"));
  }

  async enforce(now: Date = new Date()): Promise<RetentionReport> {
    const cutoff = now.getTime() - this.retentionDays * 24 * 60 * 60 * 1000;
    const report: RetentionReport = { scanned: 0, deleted: [], failed: [] };

    let files: string[];

    try {
      files = await fs.promises.readdir(this.baseDir);
    } catch (err) {
      // A missing directory just means nothing has been audited yet.
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return report;
      }
      throw err;
    }

    // `allSettled` so one unreadable file does not abandon the rest of the sweep.
    const outcomes = await Promise.allSettled(
      files
        .filter((file) => file.endsWith(".log"))
        .map(async (file) => {
          const target = path.join(this.baseDir, file);
          report.scanned += 1;

          const stat = await fs.promises.stat(target);

          if (stat.mtime.getTime() >= cutoff) {
            return null;
          }

          await fs.promises.unlink(target);
          return file;
        }),
    );

    outcomes.forEach((outcome, index) => {
      if (outcome.status === "fulfilled") {
        if (outcome.value) {
          report.deleted.push(outcome.value);
        }
        return;
      }

      const reason =
        outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
      report.failed.push({ file: files[index], reason });
    });

    if (report.deleted.length > 0 || report.failed.length > 0) {
      log.info("Retention sweep complete", {
        scanned: report.scanned,
        deleted: report.deleted.length,
        failed: report.failed.length,
        retentionDays: this.retentionDays,
      });
    }

    if (report.failed.length > 0) {
      log.error("Retention sweep had failures", { failed: report.failed });
    }

    return report;
  }
}
