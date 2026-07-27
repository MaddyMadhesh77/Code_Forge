import { Router } from "express";
import { z } from "zod";

import { idParam, paginationQuery } from "./schemas.js";
import type { AppModule } from "../../app.module.js";
import { currentUser } from "../../common/decorators/current-user.decorator.js";
import { asyncHandler } from "../../common/filters/global-exception.filter.js";
import { requireRoles } from "../../common/guards/roles.guard.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../common/pipes/zod-validation.pipe.js";

const updateUserBody = z
  .object({
    displayName: z.string().min(2).max(80).optional(),
    avatarUrl: z.string().url().max(2_000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export function usersRoutes(app: AppModule): Router {
  const router = Router();
  const users = app.users.controller;

  router.use(app.guards.jwt.canActivate());

  router.get(
    "/",
    requireRoles("INTERVIEWER"),
    validateQuery(paginationQuery),
    asyncHandler(async (req, res) => {
      const { limit, offset } = req.query as never;
      const page = await users.list({
        limit,
        offset,
        // Only admins see deactivated accounts.
        includeInactive: currentUser(req).role === "ADMIN",
      });

      res.paginated(page.items, { total: page.total, limit: page.limit, offset: page.offset });
    }),
  );

  router.get(
    "/:id",
    validateParams(idParam),
    asyncHandler(async (req, res) => {
      res.json(await users.get(req.params.id));
    }),
  );

  router.patch(
    "/:id",
    validateParams(idParam),
    validateBody(updateUserBody),
    asyncHandler(async (req, res) => {
      res.json(await users.update(currentUser(req), req.params.id, req.body));
    }),
  );

  router.post(
    "/:id/deactivate",
    requireRoles("ADMIN"),
    validateParams(idParam),
    asyncHandler(async (req, res) => {
      res.json(await users.deactivate(currentUser(req), req.params.id));
    }),
  );

  router.post(
    "/:id/activate",
    requireRoles("ADMIN"),
    validateParams(idParam),
    asyncHandler(async (req, res) => {
      res.json(await users.activate(req.params.id));
    }),
  );

  return router;
}
