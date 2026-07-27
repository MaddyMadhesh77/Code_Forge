import { Prisma, PrismaClient } from "@prisma/client";

import { getConfig } from "../config/env.js";
import { logger } from "../common/logging/logger.js";

const log = logger.child("PrismaService");

export type PrismaHealth = {
  connected: boolean;
  datasource: "postgresql";
  latencyMs?: number;
  error?: string;
};

/**
 * The real Prisma client for this process.
 *
 * This used to be an in-memory array pretending to be a database. It is now a
 * genuine `PrismaClient`: `connect()` opens a pooled connection and fails loudly
 * if the database is unreachable, so a misconfigured deployment cannot start up
 * and silently serve fabricated rows.
 */
export class PrismaService extends PrismaClient {
  private connected = false;

  constructor(datasourceUrl: string = getConfig().databaseUrl) {
    super({
      datasources: { db: { url: datasourceUrl } },
      log: [
        { emit: "event", level: "warn" },
        { emit: "event", level: "error" },
      ],
    });

    // Prisma's typed event emitter doesn't narrow well through the subclass;
    // the casts keep the listeners without loosening the rest of the client.
    (this as unknown as { $on: (event: string, cb: (e: { message: string }) => void) => void }).$on(
      "warn",
      (event) => log.warn(event.message),
    );
    (this as unknown as { $on: (event: string, cb: (e: { message: string }) => void) => void }).$on(
      "error",
      (event) => log.error(event.message),
    );
  }

  async connect(): Promise<PrismaHealth> {
    await this.$connect();
    this.connected = true;
    log.info("Connected to PostgreSQL");
    return this.status();
  }

  async disconnect(): Promise<void> {
    await this.$disconnect();
    this.connected = false;
  }

  /** Round-trips a trivial query so health checks reflect the real connection. */
  async status(): Promise<PrismaHealth> {
    const startedAt = Date.now();

    try {
      await this.$queryRaw`SELECT 1`;
      this.connected = true;
      return { connected: true, datasource: "postgresql", latencyMs: Date.now() - startedAt };
    } catch (error) {
      this.connected = false;
      return {
        connected: false,
        datasource: "postgresql",
        error: error instanceof Error ? error.message : "unknown error",
      };
    }
  }

  get isConnected(): boolean {
    return this.connected;
  }
}

/** True when Prisma rejected a write because a unique constraint already held. */
export function isUniqueViolation(error: unknown, target?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  if (!target) {
    return true;
  }

  const meta = error.meta as { target?: string[] | string } | undefined;
  const fields = Array.isArray(meta?.target) ? meta.target : [meta?.target].filter(Boolean);
  return fields.some((field) => String(field).includes(target));
}

/** True when Prisma could not find the row an update/delete targeted. */
export function isNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}
