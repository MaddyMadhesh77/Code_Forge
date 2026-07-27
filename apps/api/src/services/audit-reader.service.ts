import fs from "node:fs";
import path from "node:path";

import { assertValidTenantId, resolveAuditLogPath } from "./audit-paths.js";
import { NotFoundError } from "../common/errors/app-error.js";

export type AuditQuery = {
  tenant: string;
  limit?: number;
};

export type AuditPage = {
  tenant: string;
  count: number;
  entries: unknown[];
};

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 2000;

/** Refuse to slurp a log that has grown beyond what we can hold comfortably. */
const MAX_READ_BYTES = 32 * 1024 * 1024;

/**
 * Reads tenant audit logs for the operator endpoints.
 *
 * All path construction goes through `resolveAuditLogPath`, which validates
 * the tenant id and confirms the result stays inside the audit directory.
 */
export class AuditReader {
  readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = path.resolve(baseDir ?? path.join(process.cwd(), "data", "audit"));
  }

  async tail(query: AuditQuery): Promise<AuditPage> {
    const tenant = assertValidTenantId(query.tenant);
    const file = resolveAuditLogPath(this.baseDir, tenant);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    let stat: fs.Stats;

    try {
      stat = await fs.promises.stat(file);
    } catch {
      throw new NotFoundError("Audit log", "AUDIT_LOG_NOT_FOUND");
    }

    if (!stat.isFile()) {
      throw new NotFoundError("Audit log", "AUDIT_LOG_NOT_FOUND");
    }

    // Read only the tail of large files rather than the whole thing.
    const start = Math.max(0, stat.size - MAX_READ_BYTES);
    const handle = await fs.promises.open(file, "r");

    let body: string;

    try {
      const length = stat.size - start;
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, start);
      body = buffer.toString("utf8");
    } finally {
      await handle.close();
    }

    // A partial first line is possible when we seeked into the middle of one.
    const lines = body.split("\n").filter((line) => line.trim().length > 0);
    const usable = start > 0 ? lines.slice(1) : lines;

    const entries = usable.slice(-limit).map((line) => {
      try {
        return JSON.parse(line) as unknown;
      } catch {
        return { raw: line };
      }
    });

    return { tenant, count: entries.length, entries };
  }

  /** Lists tenants that currently have an audit log. */
  async listTenants(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.baseDir);
      return files
        .filter((file) => file.endsWith(".log"))
        .map((file) => file.slice(0, -".log".length))
        .sort();
    } catch {
      return [];
    }
  }
}
