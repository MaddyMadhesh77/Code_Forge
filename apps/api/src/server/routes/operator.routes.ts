import { Router } from "express";

import { auditQuery, tenantParam } from "./schemas.js";
import type { AppModule } from "../../app.module.js";
import { asyncHandler } from "../../common/filters/global-exception.filter.js";
import { requireRoles } from "../../common/guards/roles.guard.js";
import { validateParams, validateQuery } from "../../common/pipes/zod-validation.pipe.js";
import { ServiceUnavailableError } from "../../common/errors/app-error.js";

/**
 * Operator tooling: queue inspection and audit-log access.
 *
 * The whole router is ADMIN-only. It previously had no authentication at all,
 * and its audit endpoint interpolated a path parameter straight into a file
 * path — `/operator/audit/../../etc/passwd` read arbitrary files. Reads now go
 * through `AuditReader`, which validates the tenant id and confirms the
 * resolved path stays inside the audit directory.
 */
export function operatorRoutes(app: AppModule): Router {
  const router = Router();

  router.use(app.guards.jwt.canActivate(), requireRoles("ADMIN"));

  router.get(
    "/dlq",
    asyncHandler(async (_req, res) => {
      const queue = app.queue;

      if (!queue) {
        throw new ServiceUnavailableError("Queue is not configured", "QUEUE_NOT_CONFIGURED");
      }

      const [main, dead] = await Promise.all([
        queue.queue.getJobCounts(),
        queue.dlq.getJobCounts(),
      ]);

      res.json({ queue: main, dlq: dead });
    }),
  );

  router.get(
    "/dlq/recent",
    asyncHandler(async (_req, res) => {
      const queue = app.queue;

      if (!queue) {
        throw new ServiceUnavailableError("Queue is not configured", "QUEUE_NOT_CONFIGURED");
      }

      const jobs = await queue.dlq.getJobs(
        ["waiting", "active", "delayed", "failed", "completed"],
        0,
        49,
      );

      res.json({
        jobs: jobs.map((job) => ({
          id: job.id,
          data: job.data,
          failedReason: (job as { failedReason?: string }).failedReason,
        })),
      });
    }),
  );

  router.get(
    "/audit",
    asyncHandler(async (_req, res) => {
      res.json({ tenants: await app.auditReader.listTenants() });
    }),
  );

  router.get(
    "/audit/:tenant",
    validateParams(tenantParam),
    validateQuery(auditQuery),
    asyncHandler(async (req, res) => {
      const { limit } = req.query as unknown as { limit: number };
      res.json(await app.auditReader.tail({ tenant: req.params.tenant, limit }));
    }),
  );

  return router;
}
