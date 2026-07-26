import express, { type Express } from "express";
import type { Server } from "node:http";

import { analysisRoutes } from "./routes/analysis.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { healthRoutes, oidcRoutes, scimRoutes } from "./routes/enterprise.routes.js";
import { executionRoutes } from "./routes/execution.routes.js";
import { interviewsRoutes } from "./routes/interviews.routes.js";
import { operatorRoutes } from "./routes/operator.routes.js";
import { problemsRoutes } from "./routes/problems.routes.js";
import { usersRoutes } from "./routes/users.routes.js";
import { webhooksRoutes } from "./routes/webhooks.routes.js";
import { AppModule } from "../app.module.js";
import {
  GlobalExceptionFilter,
  notFoundHandler,
} from "../common/filters/global-exception.filter.js";
import { LoggingInterceptor, requestId } from "../common/interceptors/logging.interceptor.js";
import { TimeoutInterceptor } from "../common/interceptors/timeout.interceptor.js";
import { TransformInterceptor } from "../common/interceptors/transform.interceptor.js";
import { MetricsMiddleware } from "../common/middleware/metrics.middleware.js";
import {
  cors,
  RateLimiter,
  requireJsonContentType,
  securityHeaders,
} from "../common/middleware/security.middleware.js";
import { logger } from "../common/logging/logger.js";
import { getConfig } from "../config/env.js";

const log = logger.child("http.server");

/**
 * Builds the Express application.
 *
 * This file used to be 610 lines holding every route inline alongside five
 * in-memory Maps. It now does one job: assemble middleware in the right order
 * and mount routers. Each router owns its own concern and lives in `routes/`.
 */
export function createApp(app: AppModule): Express {
  const config = app.config;
  const server = express();

  // Required for correct client IPs (and therefore rate limiting) behind a
  // load balancer. Off by default: trusting XFF unconditionally lets a client
  // spoof its own address.
  if (config.http.trustProxy) {
    server.set("trust proxy", 1);
  }

  server.disable("x-powered-by");

  // --- Order matters below ---------------------------------------------
  // 1. Identify the request, 2. secure it, 3. parse it, 4. observe it,
  // 5. route it, 6. handle what fell through.

  server.use(requestId());
  server.use(securityHeaders(config));
  server.use(cors(config));

  const globalLimiter = new RateLimiter(
    config.http.rateLimitWindowMs,
    config.http.rateLimitMax,
    "global",
  );
  app.registerDisposable(() => globalLimiter.stop());
  server.use(globalLimiter.middleware());

  server.use(requireJsonContentType());
  // An explicit body limit; the default 100kb was never stated anywhere.
  server.use(express.json({ limit: config.http.bodyLimit }));

  const metrics = new MetricsMiddleware();

  server.use(new TransformInterceptor().middleware());
  server.use(new LoggingInterceptor().middleware());
  server.use(new TimeoutInterceptor().middleware());
  server.use((req, res, next) => metrics.use(req, res, next));
  server.use((req, res, next) => app.audit.use(req, res, next));

  // Health and metrics stay unprefixed — probes and scrapers expect them there.
  server.use(healthRoutes(app));

  // Everything else is namespaced under /api. The previous surface mixed
  // `/api/problems`, `/problems`, `/interviews` and `/auth` arbitrarily.
  const api = express.Router();
  api.use("/auth", authRoutes(app));
  api.use("/users", usersRoutes(app));
  api.use("/problems", problemsRoutes(app));
  api.use("/execution", executionRoutes(app));
  api.use("/interviews", interviewsRoutes(app));
  api.use("/analysis", analysisRoutes(app));
  api.use("/webhooks", webhooksRoutes(app));
  server.use("/api", api);

  server.use("/operator", operatorRoutes(app));

  // SSO and SCIM live at their spec-mandated paths.
  if (app.oidc.enabled) {
    server.use("/auth", oidcRoutes(app));
  }

  if (config.scim.enabled) {
    server.use("/scim/v2", scimRoutes(app));
    server.use("/scim", scimRoutes(app));
  }

  server.use(notFoundHandler());
  server.use(new GlobalExceptionFilter().handler());

  return server;
}

export type StartedServer = {
  server: Server;
  app: AppModule;
  close: () => Promise<void>;
};

/** Boots the module graph and starts listening. */
export async function startServer(port = getConfig().port): Promise<StartedServer> {
  const appModule = new AppModule();
  await appModule.init();

  const expressApp = createApp(appModule);

  const server = await new Promise<Server>((resolve, reject) => {
    const instance = expressApp.listen(port, () => resolve(instance));
    instance.once("error", reject);
  });

  log.info("HTTP server listening", { port });

  const close = async (): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await appModule.shutdown();
  };

  return { server, app: appModule, close };
}
