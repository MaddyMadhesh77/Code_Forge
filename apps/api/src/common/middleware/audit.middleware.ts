import type { NextFunction, Request, Response } from "express";

import { logger } from "../logging/logger.js";
import { AuditForwarder } from "../../services/audit-forwarder.service.js";

const log = logger.child("audit");

export type AuditEntry = {
  timestamp: string;
  tenant: string;
  user: string;
  requestId?: string;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
};

/**
 * Records one audit entry per completed request.
 *
 * The actor is taken from the authenticated principal where one exists — the
 * previous version trusted an `X-User-Id` header, which any client could set
 * to attribute their actions to someone else.
 */
export class AuditMiddleware {
  constructor(private readonly forwarder?: AuditForwarder) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const tenant = typeof req.headers["x-tenant-id"] === "string" ? req.headers["x-tenant-id"] : "unknown";

    res.on("finish", () => {
      const entry: AuditEntry = {
        timestamp: new Date().toISOString(),
        tenant,
        // `req.user` is set by JwtAuthGuard from a verified token.
        user: req.user?.id ?? "anonymous",
        requestId: req.requestId,
        method: req.method,
        // Query strings can carry tokens; keep them out of the audit trail.
        path: req.originalUrl.split("?")[0],
        status: res.statusCode,
        duration_ms: Date.now() - start,
      };

      this.forwarder?.forward(entry).catch((err) => {
        // Never fail the request over an audit write, but never lose the
        // failure either — this was previously `.catch(() => {})`.
        log.error("Failed to persist audit entry", { requestId: req.requestId, err });
      });
    });

    next();
  }
}
