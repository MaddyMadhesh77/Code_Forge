import type { NextFunction, Request, RequestHandler, Response } from "express";

import type { AppConfig } from "../../config/env.js";
import { ForbiddenError } from "../errors/app-error.js";

/**
 * Baseline security response headers.
 *
 * Equivalent to the subset of `helmet` that matters for a JSON API; written
 * inline to avoid pulling a dependency for eight header assignments.
 */
export function securityHeaders(config: AppConfig): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction) => {
    // An API serves no HTML, so the strictest possible CSP is correct here.
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");

    // Advertising the framework only helps someone fingerprint known CVEs.
    res.removeHeader("X-Powered-By");

    if (config.isProduction) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }

    next();
  };
}

/**
 * CORS restricted to an explicit allowlist.
 *
 * Origins are compared exactly — no wildcard and no prefix matching, since
 * `startsWith` checks are how `evil-example.com.attacker.net` gets through.
 */
export function cors(config: AppConfig): RequestHandler {
  const allowed = new Set(config.http.corsAllowedOrigins);

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (typeof origin === "string" && allowed.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      // The response varies by Origin, so caches must key on it.
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization,X-Tenant-Id,X-Request-Id,Idempotency-Key",
      );
      res.setHeader("Access-Control-Expose-Headers", "X-Request-Id,Retry-After");
      res.setHeader("Access-Control-Max-Age", "600");
    }

    if (req.method === "OPTIONS") {
      // Preflight for a disallowed origin gets no CORS headers, so the browser
      // blocks the real request.
      res.status(typeof origin === "string" && !allowed.has(origin) ? 403 : 204).end();
      return;
    }

    next();
  };
}

type Bucket = { count: number; resetAt: number };

/**
 * Fixed-window rate limiter backed by an in-process map.
 *
 * Adequate for a single instance; behind multiple replicas this should move to
 * Redis (the `QueueModule` connection is already available) so the limit is
 * shared. Documented rather than silently under-enforced.
 */
export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly sweeper: NodeJS.Timeout;

  constructor(
    private readonly windowMs: number,
    private readonly max: number,
    private readonly keyPrefix = "default",
  ) {
    // Without eviction the map grows once per distinct key, forever.
    this.sweeper = setInterval(() => this.sweep(), Math.max(windowMs, 30_000));
    this.sweeper.unref?.();
  }

  private sweep(): void {
    const now = Date.now();

    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }

  private hit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      const bucket = { count: 1, resetAt: now + this.windowMs };
      this.buckets.set(key, bucket);
      return { allowed: true, remaining: this.max - 1, resetAt: bucket.resetAt };
    }

    existing.count += 1;

    return {
      allowed: existing.count <= this.max,
      remaining: Math.max(0, this.max - existing.count),
      resetAt: existing.resetAt,
    };
  }

  /**
   * Rate-limits by authenticated user when available, otherwise by client IP.
   * Keying on the user first stops one NAT'd office from sharing a budget.
   */
  middleware(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      const identity = req.user?.id ?? req.ip ?? "unknown";
      const { allowed, remaining, resetAt } = this.hit(`${this.keyPrefix}:${identity}`);
      const resetSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

      res.setHeader("RateLimit-Limit", String(this.max));
      res.setHeader("RateLimit-Remaining", String(remaining));
      res.setHeader("RateLimit-Reset", String(resetSeconds));

      if (!allowed) {
        res.setHeader("Retry-After", String(resetSeconds));
        res.status(429).json({
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests",
            ...(req.requestId ? { requestId: req.requestId } : {}),
          },
        });
        return;
      }

      next();
    };
  }

  /** Releases the sweep timer; call on shutdown so tests and workers exit. */
  stop(): void {
    clearInterval(this.sweeper);
  }
}

/**
 * Rejects requests whose `Content-Type` is not JSON on methods that carry a
 * body, so a form-encoded or `text/plain` post cannot slip past JSON parsing.
 */
export function requireJsonContentType(): RequestHandler {
  const methodsWithBody = new Set(["POST", "PUT", "PATCH"]);

  return (req: Request, _res: Response, next: NextFunction) => {
    if (!methodsWithBody.has(req.method)) {
      next();
      return;
    }

    // No body at all is fine; some PUT/POST endpoints take none.
    if (!req.headers["content-length"] && !req.headers["transfer-encoding"]) {
      next();
      return;
    }

    const contentType = String(req.headers["content-type"] ?? "");

    if (!contentType.toLowerCase().startsWith("application/json")) {
      next(new ForbiddenError("Content-Type must be application/json", "UNSUPPORTED_MEDIA_TYPE"));
      return;
    }

    next();
  };
}
