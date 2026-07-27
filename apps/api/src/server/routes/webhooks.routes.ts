import { Router } from "express";

import { createWebhookBody, idParam } from "./schemas.js";
import type { AppModule } from "../../app.module.js";
import { asyncHandler } from "../../common/filters/global-exception.filter.js";
import { requireRoles } from "../../common/guards/roles.guard.js";
import { validateBody, validateParams } from "../../common/pipes/zod-validation.pipe.js";
import { BadRequestError } from "../../common/errors/app-error.js";
import type { Request } from "express";

/**
 * Webhook subscription management.
 *
 * Tenant scoping is enforced on every operation, so one tenant cannot list or
 * delete another's subscriptions by guessing an id.
 */
export function webhooksRoutes(app: AppModule): Router {
  const router = Router();

  router.use(app.guards.jwt.canActivate(), requireRoles("ADMIN"));

  router.post(
    "/",
    validateBody(createWebhookBody),
    asyncHandler(async (req, res) => {
      const registration = await app.publicAPI.registerWebhook(
        tenantOf(req),
        req.body.url,
        req.body.events,
      );

      // The signing secret is shown once, at creation, and never listed again.
      res.status(201).json(registration);
    }),
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      res.json({ webhooks: await app.publicAPI.listWebhooks(tenantOf(req)) });
    }),
  );

  router.delete(
    "/:id",
    validateParams(idParam),
    asyncHandler(async (req, res) => {
      await app.publicAPI.deleteWebhook(tenantOf(req), req.params.id);
      res.status(204).end();
    }),
  );

  return router;
}

function tenantOf(req: Request): string {
  const tenant = req.headers["x-tenant-id"];

  if (typeof tenant !== "string" || tenant.trim().length === 0) {
    throw new BadRequestError("X-Tenant-Id header is required", undefined, "MISSING_TENANT");
  }

  return tenant.trim();
}
