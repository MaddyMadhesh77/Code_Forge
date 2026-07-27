import { randomUUID } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";

import { logger } from "../logging/logger.js";

const log = logger.child("http");

/**
 * Assigns a request id (honouring an inbound `X-Request-Id` when it looks
 * sane) and echoes it back, so a client-reported failure can be traced to a
 * specific log line.
 */
export function requestId(): RequestHandler {
  const SAFE_ID = /^[A-Za-z0-9._-]{1,128}$/;

  return (req: Request, res: Response, next: NextFunction) => {
    const inbound = req.headers["x-request-id"];
    const candidate = Array.isArray(inbound) ? inbound[0] : inbound;

    req.requestId =
      typeof candidate === "string" && SAFE_ID.test(candidate) ? candidate : randomUUID();

    res.setHeader("X-Request-Id", req.requestId);
    next();
  };
}

/**
 * Structured access logging. Emits one line per completed request with the
 * status, duration and principal — replacing the empty stub this file held.
 */
export class LoggingInterceptor {
  middleware(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      const startedAt = process.hrtime.bigint();

      res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        const entry = {
          requestId: req.requestId,
          method: req.method,
          // `route.path` keeps ids out of the log; falls back for unmatched routes.
          path: req.route?.path ?? req.originalUrl.split("?")[0],
          status: res.statusCode,
          durationMs: Number(durationMs.toFixed(2)),
          userId: req.user?.id,
        };

        if (res.statusCode >= 500) {
          log.error("request", entry);
        } else if (res.statusCode >= 400) {
          log.warn("request", entry);
        } else {
          log.info("request", entry);
        }
      });

      next();
    };
  }
}
