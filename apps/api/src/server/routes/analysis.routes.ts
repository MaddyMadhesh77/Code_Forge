import { Router } from "express";
import { z } from "zod";

import { languageEnum } from "./schemas.js";
import type { AppModule } from "../../app.module.js";
import { asyncHandler } from "../../common/filters/global-exception.filter.js";
import { validateBody } from "../../common/pipes/zod-validation.pipe.js";

const analyzeBody = z.object({
  code: z.string().min(1).max(200_000),
  language: languageEnum.default("python"),
});

/**
 * Static code analysis: complexity estimation and rule-based review.
 *
 * The responses are explicitly labelled `analyzer: "static-rules"` so the UI
 * does not present deterministic heuristics as model-generated insight.
 */
export function analysisRoutes(app: AppModule): Router {
  const router = Router();

  router.use(app.guards.jwt.canActivate());

  router.post(
    "/complexity",
    validateBody(analyzeBody),
    asyncHandler(async (req, res) => {
      res.json(app.analysis.complexity.analyze(req.body.code, req.body.language));
    }),
  );

  router.post(
    "/review",
    validateBody(analyzeBody),
    asyncHandler(async (req, res) => {
      res.json(app.analysis.review.reviewCode(req.body.code, req.body.language));
    }),
  );

  return router;
}
