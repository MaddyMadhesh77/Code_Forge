import { Router } from "express";

import { idParam, runCodeBody } from "./schemas.js";
import type { AppModule } from "../../app.module.js";
import { currentUser } from "../../common/decorators/current-user.decorator.js";
import { asyncHandler } from "../../common/filters/global-exception.filter.js";
import { RateLimiter } from "../../common/middleware/security.middleware.js";
import { validateBody, validateParams } from "../../common/pipes/zod-validation.pipe.js";
import { getConfig } from "../../config/env.js";

/**
 * Code execution.
 *
 * Runs are persisted, so `GET /:runId` keeps working across restarts and
 * replicas. Submission has its own rate limit because each run costs a sandbox.
 */
export function executionRoutes(app: AppModule): Router {
  const router = Router();
  const config = getConfig();
  const runs = app.execution.runService;

  const runLimiter = new RateLimiter(config.http.rateLimitWindowMs, 30, "execution");
  app.registerDisposable(() => runLimiter.stop());

  router.post(
    "/run",
    app.guards.jwt.canActivate(),
    runLimiter.middleware(),
    validateBody(runCodeBody),
    asyncHandler(async (req, res) => {
      const run = await runs.startRun(currentUser(req), req.body);
      res.status(202).json(run);
    }),
  );

  router.get(
    "/run/:id",
    app.guards.jwt.canActivate(),
    validateParams(idParam),
    asyncHandler(async (req, res) => {
      res.json(await runs.getRun(currentUser(req), req.params.id));
    }),
  );

  // Pulls completed worker results into the run rows. Also runs on a timer;
  // the endpoint lets a client force a refresh.
  router.post(
    "/sync",
    app.guards.jwt.canActivate(),
    asyncHandler(async (_req, res) => {
      res.json({ applied: await runs.ingestResults() });
    }),
  );

  return router;
}
