import { startServer, type StartedServer } from "./server/http.server.js";
import { logger } from "./common/logging/logger.js";
import { ConfigError, getConfig } from "./config/env.js";

const log = logger.child("bootstrap");

/** Give in-flight requests this long to drain before forcing exit. */
const SHUTDOWN_GRACE_MS = 15_000;

async function main(): Promise<void> {
  let config;

  try {
    config = getConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      // Configuration problems are the operator's to fix; a stack trace here
      // is noise, the list of what's missing is the useful part.
      log.error("Refusing to start with invalid configuration", {
        problems: error.problems,
      });
      process.exit(78); // EX_CONFIG
    }
    throw error;
  }

  const started: StartedServer = await startServer(config.port);
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    log.info("Received shutdown signal", { signal });

    // Backstop: if draining stalls, exit anyway rather than hanging forever.
    const forceExit = setTimeout(() => {
      log.error("Graceful shutdown timed out; forcing exit");
      process.exit(1);
    }, SHUTDOWN_GRACE_MS);
    forceExit.unref();

    try {
      await started.close();
      clearTimeout(forceExit);
      process.exit(0);
    } catch (err) {
      log.error("Error during shutdown", { err });
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  // A process in an unknown state must not keep serving traffic.
  process.on("uncaughtException", (err) => {
    log.error("Uncaught exception", { err });
    void shutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason) => {
    log.error("Unhandled promise rejection", { err: reason });
    void shutdown("unhandledRejection");
  });
}

main().catch((err) => {
  log.error("Failed to start server", { err });
  process.exit(1);
});
