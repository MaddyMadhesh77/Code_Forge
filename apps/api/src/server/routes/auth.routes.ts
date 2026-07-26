import { Router } from "express";

import { refreshTokenBody } from "./schemas.js";
import type { AppModule } from "../../app.module.js";
import { currentUser } from "../../common/decorators/current-user.decorator.js";
import { NotFoundError } from "../../common/errors/app-error.js";
import { asyncHandler } from "../../common/filters/global-exception.filter.js";
import { validateBody } from "../../common/pipes/zod-validation.pipe.js";
import { RateLimiter } from "../../common/middleware/security.middleware.js";
import { getConfig } from "../../config/env.js";

/**
 * Authentication endpoints.
 *
 * Credential endpoints get their own, much tighter rate limit than the global
 * one — this is the surface an attacker brute-forces.
 */
export function authRoutes(app: AppModule): Router {
  const router = Router();
  const config = getConfig();
  const auth = app.auth.controller;

  const credentialLimiter = new RateLimiter(
    config.http.rateLimitWindowMs,
    config.http.authRateLimitMax,
    "auth",
  );
  app.registerDisposable(() => credentialLimiter.stop());

  router.post(
    "/register",
    credentialLimiter.middleware(),
    asyncHandler(async (req, res) => {
      const session = await auth.register(req.body);
      res.status(201).json(session);
    }),
  );

  router.post(
    "/login",
    credentialLimiter.middleware(),
    asyncHandler(async (req, res) => {
      res.json(await auth.login(req.body));
    }),
  );

  router.post(
    "/refresh",
    credentialLimiter.middleware(),
    validateBody(refreshTokenBody),
    asyncHandler(async (req, res) => {
      res.json(await auth.refresh(req.body.refreshToken));
    }),
  );

  router.post(
    "/logout",
    validateBody(refreshTokenBody),
    asyncHandler(async (req, res) => {
      await auth.revoke(req.body.refreshToken);
      // Always 204: revealing whether the token existed would leak information.
      res.status(204).end();
    }),
  );

  router.get(
    "/me",
    app.guards.jwt.canActivate(),
    asyncHandler(async (req, res) => {
      const user = await auth.me(currentUser(req).id);

      if (!user) {
        throw new NotFoundError("User", "USER_NOT_FOUND");
      }

      res.json(user);
    }),
  );

  return router;
}
