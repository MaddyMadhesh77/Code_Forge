import * as client from 'prom-client';

export class MetricsController {
  async metrics() {
    // Ensure default metrics are collected at module init
    return await client.register.metrics();
  }
}

export class MetricsModule {
  controller = new MetricsController();

  constructor() {
    client.collectDefaultMetrics();
  }
}

