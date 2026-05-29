export class PublicAPIService {
  webhooks: Map<string, { url: string; events: string[] }> = new Map();

  // Register a webhook endpoint
  registerWebhook(tenantId: string, url: string, events: string[]): string {
    const id = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.webhooks.set(id, { url, events });
    // eslint-disable-next-line no-console
    console.log(`Webhook ${id} registered for tenant ${tenantId}: ${url}`);
    return id;
  }

  // List webhooks for a tenant
  listWebhooks(): Array<{ id: string; url: string; events: string[] }> {
    return Array.from(this.webhooks.entries()).map(([id, { url, events }]) => ({
      id,
      url,
      events,
    }));
  }

  // Delete a webhook
  deleteWebhook(id: string): boolean {
    return this.webhooks.delete(id);
  }

  // Fire a webhook for an event (async, no wait)
  async fireWebhook(event: string, payload: unknown) {
    for (const [, { url, events }] of this.webhooks) {
      if (events.includes(event) || events.includes('*')) {
        // Fire in background; do not wait
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
        }).catch(() => {});
      }
    }
  }
}

export const publicAPIService = new PublicAPIService();
