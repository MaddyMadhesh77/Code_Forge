import fs from "node:fs";
import path from "node:path";

import { resolveAuditLogPath } from "./audit-paths.js";
import { logger } from "../common/logging/logger.js";

const log = logger.child("AuditForwarder");

export type AuditEntry = Record<string, unknown> & { tenant?: string };

/**
 * Appends audit entries to a per-tenant, append-only log file.
 *
 * Writes are serialised through a per-file promise chain: concurrent
 * `appendFile` calls on the same path can interleave and produce a corrupt
 * line, which would silently break the JSONL format.
 */
export class AuditForwarder {
  readonly baseDir: string;
  private readonly writeChains = new Map<string, Promise<void>>();

  constructor(baseDir?: string) {
    this.baseDir = path.resolve(baseDir ?? path.join(process.cwd(), "data", "audit"));
    fs.mkdirSync(this.baseDir, { recursive: true, mode: 0o750 });
  }

  async forward(entry: AuditEntry): Promise<void> {
    let file: string;

    try {
      // An unrecognised tenant is logged under 'unknown' rather than dropped,
      // so a malformed header cannot make an event disappear.
      file = resolveAuditLogPath(this.baseDir, entry.tenant ?? "unknown");
    } catch {
      file = resolveAuditLogPath(this.baseDir, "unknown");
    }

    const line = `${JSON.stringify(entry)}\n`;
    const previous = this.writeChains.get(file) ?? Promise.resolve();

    const next = previous
      .catch(() => undefined)
      .then(() => fs.promises.appendFile(file, line, { encoding: "utf8", mode: 0o640 }))
      .catch((err) => {
        // Audit writes must never take down the request that triggered them,
        // but a failure has to be visible rather than swallowed.
        log.error("Failed to append audit entry", { file, err });
      });

    this.writeChains.set(file, next);

    // Bound the map: once this chain settles and nothing newer replaced it,
    // drop the entry so long-lived processes don't accumulate one per tenant.
    void next.finally(() => {
      if (this.writeChains.get(file) === next) {
        this.writeChains.delete(file);
      }
    });

    return next;
  }

  /** Waits for all in-flight appends — used on shutdown and in tests. */
  async flush(): Promise<void> {
    await Promise.allSettled([...this.writeChains.values()]);
  }
}
