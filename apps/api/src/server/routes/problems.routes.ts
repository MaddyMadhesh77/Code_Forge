import { Router } from "express";

import {
  bookmarkBody,
  createProblemBody,
  idParam,
  listProblemsQuery,
  solutionsQuery,
  testCaseBody,
  updateProblemBody,
} from "./schemas.js";
import type { AppModule } from "../../app.module.js";
import { currentUser, optionalUser } from "../../common/decorators/current-user.decorator.js";
import { asyncHandler } from "../../common/filters/global-exception.filter.js";
import { requireRoles } from "../../common/guards/roles.guard.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../common/pipes/zod-validation.pipe.js";

/**
 * Problem catalogue.
 *
 * Every handler resolves the problem through `ProblemsService`, which delegates
 * to the single `findByIdOrSlug` in the repository. The previous version
 * re-implemented that lookup in each route.
 */
export function problemsRoutes(app: AppModule): Router {
  const router = Router();
  const problems = app.problems.service;
  const { jwt } = app.guards;

  router.get(
    "/",
    jwt.optional(),
    validateQuery(listProblemsQuery),
    asyncHandler(async (req, res) => {
      const { limit, offset, difficulty, tag, search } = req.query as never;
      const page = await problems.listPublished({
        limit,
        offset,
        difficulty,
        tag,
        search,
        viewerId: optionalUser(req)?.id,
      });

      res.paginated(page.items, { total: page.total, limit: page.limit, offset: page.offset });
    }),
  );

  router.post(
    "/",
    jwt.canActivate(),
    requireRoles("INTERVIEWER"),
    validateBody(createProblemBody),
    asyncHandler(async (req, res) => {
      const problem = await problems.createProblem(currentUser(req), req.body);
      res.status(201).json(problem);
    }),
  );

  router.get(
    "/:id",
    jwt.optional(),
    validateParams(idParam),
    asyncHandler(async (req, res) => {
      res.json(await problems.getByIdOrSlug(req.params.id));
    }),
  );

  router.put(
    "/:id",
    jwt.canActivate(),
    requireRoles("INTERVIEWER"),
    validateParams(idParam),
    validateBody(updateProblemBody),
    asyncHandler(async (req, res) => {
      res.json(await problems.updateProblem(currentUser(req), req.params.id, req.body));
    }),
  );

  router.get(
    "/:id/hints",
    jwt.canActivate(),
    validateParams(idParam),
    asyncHandler(async (req, res) => {
      res.json(await problems.getHints(req.params.id));
    }),
  );

  // Reference solutions are interviewer-only; handing them to a candidate
  // mid-interview would defeat the exercise.
  router.get(
    "/:id/solutions",
    jwt.canActivate(),
    requireRoles("INTERVIEWER"),
    validateParams(idParam),
    validateQuery(solutionsQuery),
    asyncHandler(async (req, res) => {
      const { lang } = req.query as { lang?: string };
      res.json(await problems.getReferenceSolutions(req.params.id, lang));
    }),
  );

  router.post(
    "/:id/bookmark",
    jwt.canActivate(),
    validateParams(idParam),
    validateBody(bookmarkBody),
    asyncHandler(async (req, res) => {
      res.json(await problems.setBookmark(currentUser(req), req.params.id, req.body.bookmarked));
    }),
  );

  router.get(
    "/:id/test-cases",
    jwt.canActivate(),
    validateParams(idParam),
    asyncHandler(async (req, res) => {
      res.json(await problems.listTestCases(optionalUser(req), req.params.id));
    }),
  );

  router.post(
    "/:id/test-cases",
    jwt.canActivate(),
    requireRoles("INTERVIEWER"),
    validateParams(idParam),
    validateBody(testCaseBody),
    asyncHandler(async (req, res) => {
      const testCase = await problems.addTestCase(currentUser(req), req.params.id, req.body);
      res.status(201).json(testCase);
    }),
  );

  return router;
}
