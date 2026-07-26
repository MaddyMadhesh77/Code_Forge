import { Router } from "express";
import client from "prom-client";

import { idParam, oidcCallbackBody, scimPatchBody, scimUserBody } from "./schemas.js";
import type { AppModule } from "../../app.module.js";
import { asyncHandler } from "../../common/filters/global-exception.filter.js";
import { validateBody, validateParams } from "../../common/pipes/zod-validation.pipe.js";
import { NotFoundError } from "../../common/errors/app-error.js";
import { scimAuth } from "../../services/enterprise-auth.service.js";

/** OIDC single sign-on. Disabled entirely unless fully configured. */
export function oidcRoutes(app: AppModule): Router {
  const router = Router();

  router.get(
    "/authorize",
    asyncHandler(async (_req, res) => {
      const request = app.oidc.createAuthorizationRequest();

      // The verifier is returned to the caller, which must hold it until the
      // callback; it is deliberately not stored in a cookie here.
      res.json({
        authUrl: request.authUrl,
        state: request.state,
        codeVerifier: request.codeVerifier,
      });
    }),
  );

  router.post(
    "/callback",
    validateBody(oidcCallbackBody),
    asyncHandler(async (req, res) => {
      const tokens = await app.oidc.exchangeCodeForToken(req.body.code, req.body.state);
      res.json({ accessToken: tokens.accessToken, expiresIn: tokens.expiresIn });
    }),
  );

  return router;
}

/** SCIM 2.0 provisioning, guarded by a shared bearer token. */
export function scimRoutes(app: AppModule): Router {
  const router = Router();
  const scim = app.scim;

  router.use(scimAuth());
  router.use((_req, res, next) => {
    res.setHeader("Content-Type", "application/scim+json");
    next();
  });

  router.get("/ServiceProviderConfig", (_req, res) => {
    res.json(scim.getServiceProviderConfig());
  });

  router.post(
    "/Users",
    validateBody(scimUserBody),
    asyncHandler(async (req, res) => {
      const email = req.body.userName ?? req.body.emails?.[0]?.value;

      if (!email) {
        throw new NotFoundError("userName or emails[0].value", "MISSING_EMAIL");
      }

      res.status(201).json(await scim.createUser({ email, displayName: req.body.displayName }));
    }),
  );

  router.get(
    "/Users",
    asyncHandler(async (req, res) => {
      const filter = typeof req.query.filter === "string" ? req.query.filter : undefined;
      const resources = await scim.listUsers(filter);

      res.json({
        schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
        totalResults: resources.length,
        Resources: resources,
      });
    }),
  );

  router.get(
    "/Users/:id",
    validateParams(idParam),
    asyncHandler(async (req, res) => {
      const user = await scim.getUser(req.params.id);

      if (!user) {
        throw new NotFoundError("User", "USER_NOT_FOUND");
      }

      res.json(user);
    }),
  );

  router.patch(
    "/Users/:id",
    validateParams(idParam),
    validateBody(scimPatchBody),
    asyncHandler(async (req, res) => {
      const operations = req.body.Operations as Array<{ path?: string; value?: unknown }>;
      const active = operations.find((op) => op.path === "active")?.value;
      const displayName = operations.find((op) => op.path === "displayName")?.value;

      const updated = await scim.updateUser(req.params.id, {
        ...(typeof active === "boolean" ? { active } : {}),
        ...(typeof displayName === "string" ? { displayName } : {}),
      });

      if (!updated) {
        throw new NotFoundError("User", "USER_NOT_FOUND");
      }

      res.json(await scim.getUser(req.params.id));
    }),
  );

  router.delete(
    "/Users/:id",
    validateParams(idParam),
    asyncHandler(async (req, res) => {
      if (!(await scim.deleteUser(req.params.id))) {
        throw new NotFoundError("User", "USER_NOT_FOUND");
      }

      res.status(204).end();
    }),
  );

  return router;
}

/** Liveness, readiness and Prometheus metrics. */
export function healthRoutes(app: AppModule): Router {
  const router = Router();

  // Liveness: the process is up. Deliberately does not touch the database —
  // a DB outage should not cause the orchestrator to kill healthy pods.
  router.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  // Readiness: can this instance actually serve traffic?
  router.get(
    "/ready",
    asyncHandler(async (_req, res) => {
      const database = await app.database.prisma.status();

      res.status(database.connected ? 200 : 503).json({
        status: database.connected ? "ready" : "degraded",
        checks: { database },
      });
    }),
  );

  router.get(
    "/metrics",
    asyncHandler(async (_req, res) => {
      res.setHeader("Content-Type", client.register.contentType);
      res.end(await client.register.metrics());
    }),
  );

  return router;
}
