import type { NextFunction, Request, RequestHandler, Response } from "express";

import { ForbiddenError, UnauthorizedError } from "../errors/app-error.js";
import { logger } from "../logging/logger.js";

const log = logger.child("RolesGuard");

export type AppRole = "CANDIDATE" | "INTERVIEWER" | "ADMIN";

/**
 * Role hierarchy: a higher role satisfies any requirement below it, so
 * `requireRoles('INTERVIEWER')` also admits ADMIN without every call site
 * having to spell out the full list.
 */
const ROLE_RANK: Record<AppRole, number> = {
  CANDIDATE: 1,
  INTERVIEWER: 2,
  ADMIN: 3,
};

function rankOf(role: string): number {
  return ROLE_RANK[role as AppRole] ?? 0;
}

/**
 * Authorises an already-authenticated request against a set of roles.
 * Must run after `JwtAuthGuard`; an absent `req.user` is treated as a 401
 * rather than silently allowing the request through.
 */
export class RolesGuard {
  canActivate(...allowed: AppRole[]): RequestHandler {
    if (allowed.length === 0) {
      throw new Error("RolesGuard requires at least one role");
    }

    const minimumRank = Math.min(...allowed.map(rankOf));

    return (req: Request, _res: Response, next: NextFunction) => {
      const user = req.user;

      if (!user) {
        next(new UnauthorizedError("Authentication required", "MISSING_TOKEN"));
        return;
      }

      if (rankOf(user.role) < minimumRank) {
        log.warn("Role check failed", {
          userId: user.id,
          role: user.role,
          required: allowed,
          path: req.originalUrl,
        });
        next(new ForbiddenError(`Requires one of: ${allowed.join(", ")}`));
        return;
      }

      next();
    };
  }
}

const guard = new RolesGuard();

/** Convenience wrapper so routes read `requireRoles('ADMIN')`. */
export const requireRoles = (...allowed: AppRole[]): RequestHandler => guard.canActivate(...allowed);
