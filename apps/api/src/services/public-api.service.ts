import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { NotFoundError } from "../common/errors/app-error.js";
import { logger } from "../common/logging/logger.js";
import { PrismaService } from "../database/prisma.service.js";

const log = logger.child("PublicAPI");

export type WebhookRecord = {
  id: string;
  tenantId: string;
  url: string;
  events: string[];
  isActive: boolean;
  failureCount: number;
  lastError: string | null;
  lastDeliveryAt: string | null;
};

export type WebhookRegistration = WebhookRecord & {
  /** Returned once, at creation time, so the caller can verify signatures. */
  secret: string;
};

const DELIVERY_TIMEOUT_MS = 5_000;
const MAX_CONSECUTIVE_FAILURES = 10;

/**
 * Webhook registration and delivery.
 *
 * Registrations are persisted (they were an in-process `Map`), deliveries are
 * HMAC-signed so receivers can authenticate them, and failures are recorded
 * instead of being dropped by a bare `.catch(() => {})`.
 */
export class PublicAPIService {
  constructor(private readonly prisma: PrismaService) {}

  async registerWebhook(
    tenantId: string,
    url: string,
    events: string[],
  ): Promise<WebhookRegistration> {
    const secret = randomBytes(32).toString("hex");

    const row = await this.prisma.webhook.create({
      data: { tenantId, url, events, secret },
    });

    log.info("Webhook registered", { webhookId: row.id, tenantId, events });

    return { ...this.toRecord(row), secret };
  }

  async listWebhooks(tenantId: string): Promise<WebhookRecord[]> {
    const rows = await this.prisma.webhook.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => this.toRecord(row));
  }

  /** Scoped by tenant so one tenant cannot delete another's webhook by id. */
  async deleteWebhook(tenantId: string, id: string): Promise<boolean> {
    const { count } = await this.prisma.webhook.deleteMany({ where: { id, tenantId } });

    if (count === 0) {
      throw new NotFoundError("Webhook", "WEBHOOK_NOT_FOUND");
    }

    log.info("Webhook deleted", { webhookId: id, tenantId });
    return true;
  }

  /**
   * Delivers an event to every matching subscriber.
   *
   * Returns per-webhook outcomes rather than firing and forgetting, so callers
   * can surface partial failures. Each delivery is time-bounded and signed.
   */
  async fireWebhook(
    tenantId: string,
    event: string,
    payload: unknown,
  ): Promise<Array<{ webhookId: string; delivered: boolean; error?: string }>> {
    const subscribers = await this.prisma.webhook.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ events: { has: event } }, { events: { has: "*" } }],
      },
    });

    if (subscribers.length === 0) {
      return [];
    }

    return Promise.all(
      subscribers.map(async (webhook) => {
        const body = JSON.stringify({
          event,
          payload,
          timestamp: new Date().toISOString(),
        });

        try {
          await this.deliver(webhook.url, body, webhook.secret);
          await this.recordSuccess(webhook.id);
          return { webhookId: webhook.id, delivered: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await this.recordFailure(webhook.id, message);
          log.warn("Webhook delivery failed", {
            webhookId: webhook.id,
            url: webhook.url,
            event,
            err: error,
          });
          return { webhookId: webhook.id, delivered: false, error: message };
        }
      }),
    );
  }

  private async deliver(url: string, body: string, secret: string): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = signPayload(secret, timestamp, body);

    // Without an explicit timeout a hung receiver would pin this request open.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CodeForge-Timestamp": timestamp,
          "X-CodeForge-Signature": `sha256=${signature}`,
        },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Receiver responded ${response.status}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  private async recordSuccess(id: string): Promise<void> {
    await this.prisma.webhook
      .update({
        where: { id },
        data: { failureCount: 0, lastError: null, lastDeliveryAt: new Date() },
      })
      .catch((err) => log.error("Failed to record webhook success", { webhookId: id, err }));
  }

  private async recordFailure(id: string, message: string): Promise<void> {
    try {
      const row = await this.prisma.webhook.update({
        where: { id },
        data: {
          failureCount: { increment: 1 },
          lastError: message.slice(0, 500),
          lastDeliveryAt: new Date(),
        },
        select: { failureCount: true },
      });

      // Stop hammering an endpoint that has been failing consistently.
      if (row.failureCount >= MAX_CONSECUTIVE_FAILURES) {
        await this.prisma.webhook.update({ where: { id }, data: { isActive: false } });
        log.warn("Webhook disabled after repeated failures", {
          webhookId: id,
          failureCount: row.failureCount,
        });
      }
    } catch (err) {
      log.error("Failed to record webhook failure", { webhookId: id, err });
    }
  }

  private toRecord(row: {
    id: string;
    tenantId: string;
    url: string;
    events: string[];
    isActive: boolean;
    failureCount: number;
    lastError: string | null;
    lastDeliveryAt: Date | null;
  }): WebhookRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      url: row.url,
      events: row.events,
      isActive: row.isActive,
      failureCount: row.failureCount,
      lastError: row.lastError,
      lastDeliveryAt: row.lastDeliveryAt?.toISOString() ?? null,
    };
  }
}

/**
 * Signs `timestamp.body`. Including the timestamp in the signed material lets
 * receivers reject replayed deliveries.
 */
export function signPayload(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

/** Constant-time signature check, for receivers and for our own tests. */
export function verifySignature(
  secret: string,
  timestamp: string,
  body: string,
  signature: string,
): boolean {
  const expected = Buffer.from(signPayload(secret, timestamp, body));
  const provided = Buffer.from(signature.replace(/^sha256=/, ""));

  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
