import type { NextFunction, Request, RequestHandler, Response } from "express";

import { API_CONSTANTS } from "../constants/index.js";
import { TimeoutError } from "../errors/app-error.js";
import { logger } from "../logging/logger.js";

const log = logger.child("TimeoutInterceptor");

/**
 * Fails a request that exceeds its budget instead of letting the client hang
 * on a handler that will never respond.
 *
 * The timer is cleared on `finish` *and* `close` so a client disconnect does
 * not leave a pending timer holding the event loop.
 */
export class TimeoutInterceptor {
  constructor(private readonly timeoutMs: number = API_CONSTANTS.defaultTimeoutMs) {}

  middleware(overrideMs?: number): RequestHandler {
    const budget = overrideMs ?? this.timeoutMs;

    return (req: Request, res: Response, next: NextFunction) => {
      const timer = setTimeout(() => {
        if (res.headersSent || res.writableEnded) {
          return;
        }

        log.warn("Request exceeded time budget", {
          requestId: req.requestId,
          method: req.method,
          path: req.originalUrl,
          budgetMs: budget,
        });

        next(new TimeoutError(`Request exceeded ${budget}ms budget`));
      }, budget);

      timer.unref?.();

      const clear = () => clearTimeout(timer);
      res.on("finish", clear);
      res.on("close", clear);

      next();
    };
  }
}
