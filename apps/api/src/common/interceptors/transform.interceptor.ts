import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Helpers for sending consistently shaped success responses.
 *
 * The error envelope is `{ error: { code, message } }` (see
 * `GlobalExceptionFilter`); these keep the success side equally predictable
 * without forcing every existing route to change its payload shape.
 */
export class TransformInterceptor {
  middleware(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      res.ok = <T>(data: T, status = 200): void => {
        res.status(status).json(data);
      };

      res.paginated = <T>(
        items: T[],
        meta: { total: number; limit: number; offset: number },
      ): void => {
        res.status(200).json({
          items,
          meta: {
            ...meta,
            hasMore: meta.offset + items.length < meta.total,
          },
        });
      };

      res.noContent = (): void => {
        res.status(204).end();
      };

      // Ensures the request id is available on the response even for handlers
      // that never touch the logger.
      if (req.requestId && !res.getHeader("X-Request-Id")) {
        res.setHeader("X-Request-Id", req.requestId);
      }

      next();
    };
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Response {
      ok<T>(data: T, status?: number): void;
      paginated<T>(items: T[], meta: { total: number; limit: number; offset: number }): void;
      noContent(): void;
    }
  }
}
