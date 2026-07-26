import type { Request } from "express";

import type { AuthenticatedUser } from "../guards/jwt-auth.guard.js";
import { UnauthorizedError } from "../errors/app-error.js";

/**
 * Reads the principal that `JwtAuthGuard` attached to the request.
 *
 * This replaces a decorator stub that always returned `undefined`, which meant
 * every handler taking a "current user" silently received nothing.
 */
export function currentUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    // Reaching here means a route was mounted without the auth guard —
    // a wiring bug, and one that must fail closed.
    throw new UnauthorizedError("Authentication required", "MISSING_TOKEN");
  }

  return req.user;
}

/** Non-throwing variant for endpoints that also serve anonymous callers. */
export function optionalUser(req: Request): AuthenticatedUser | null {
  return req.user ?? null;
}
