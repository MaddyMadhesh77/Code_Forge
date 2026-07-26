import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { AppError, TooManyRequestsError } from "../errors/app-error.js";
import { logger } from "../logging/logger.js";
import { toFieldIssues } from "../validation/parse.js";

const log = logger.child("ExceptionFilter");

export type ErrorBody = {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
};

type Normalized = {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  retryAfterSeconds?: number;
};

/** Prisma error codes we can map to a meaningful status. */
const PRISMA_STATUS: Record<string, Normalized> = {
  P2002: { status: 409, code: "CONFLICT", message: "Resource already exists" },
  P2025: { status: 404, code: "NOT_FOUND", message: "Resource not found" },
  P2003: { status: 400, code: "FOREIGN_KEY_VIOLATION", message: "Referenced resource is missing" },
};

function normalize(error: unknown): Normalized {
  if (error instanceof AppError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details,
      ...(error instanceof TooManyRequestsError
        ? { retryAfterSeconds: error.retryAfterSeconds }
        : {}),
    };
  }

  // A Zod error that escaped a `parseWith` boundary still deserves a 422
  // rather than leaking as a 500.
  if (error instanceof ZodError) {
    return {
      status: 422,
      code: "VALIDATION_FAILED",
      message: "Request validation failed",
      details: toFieldIssues(error),
    };
  }

  const code = (error as { code?: unknown })?.code;

  if (typeof code === "string" && code in PRISMA_STATUS) {
    return PRISMA_STATUS[code];
  }

  // express.json() surfaces malformed bodies as a SyntaxError carrying `body`.
  if (error instanceof SyntaxError && "body" in error) {
    return { status: 400, code: "MALFORMED_JSON", message: "Request body is not valid JSON" };
  }

  if ((error as { type?: string })?.type === "entity.too.large") {
    return { status: 413, code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" };
  }

  return { status: 500, code: "INTERNAL_ERROR", message: "Internal server error" };
}

/**
 * Terminal error handler. Every thrown value becomes a consistently shaped
 * JSON response, and anything unexpected is logged with its stack while the
 * client only ever sees a generic message for 5xx.
 */
export class GlobalExceptionFilter {
  handler(): ErrorRequestHandler {
    return (error: unknown, req: Request, res: Response, next: NextFunction) => {
      // Delegating to Express's default handler is the only correct move once
      // headers are on the wire — writing again would corrupt the response.
      if (res.headersSent) {
        next(error);
        return;
      }

      const normalized = normalize(error);
      const context = {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        status: normalized.status,
        userId: req.user?.id,
      };

      if (normalized.status >= 500) {
        log.error("Unhandled request error", { ...context, err: error });
      } else {
        log.warn("Request failed", { ...context, code: normalized.code });
      }

      if (normalized.retryAfterSeconds) {
        res.setHeader("Retry-After", String(normalized.retryAfterSeconds));
      }

      const body: ErrorBody = {
        error: {
          code: normalized.code,
          // Never surface internal messages for 5xx.
          message: normalized.status >= 500 ? "Internal server error" : normalized.message,
          ...(req.requestId ? { requestId: req.requestId } : {}),
          ...(normalized.details !== undefined ? { details: normalized.details } : {}),
        },
      };

      res.status(normalized.status).json(body);
    };
  }
}

/** 404 handler for unmatched routes, so they get the same envelope. */
export function notFoundHandler() {
  return (req: Request, res: Response): void => {
    res.status(404).json({
      error: {
        code: "ROUTE_NOT_FOUND",
        message: `Cannot ${req.method} ${req.path}`,
        ...(req.requestId ? { requestId: req.requestId } : {}),
      },
    } satisfies ErrorBody);
  };
}

/**
 * Wraps an async route handler so a rejected promise reaches the error
 * handler. Express 4 does not await handlers, so without this an async throw
 * becomes an unhandled rejection and the request hangs until it times out.
 */
export function asyncHandler<T>(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<T>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
