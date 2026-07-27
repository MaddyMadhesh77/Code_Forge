import { Request, Response, NextFunction } from 'express';
import * as client from 'prom-client';

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
});

const httpRequestErrors = new client.Counter({
  name: 'http_request_errors_total',
  help: 'Total HTTP request errors',
  labelNames: ['method', 'path'],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export class MetricsMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const path = req.route?.path || req.originalUrl;
      httpRequestsTotal.inc({ method: req.method, path, status: res.statusCode });
      if (res.statusCode >= 400) {
        httpRequestErrors.inc({ method: req.method, path });
      }
      httpRequestDuration.observe({ method: req.method, path }, duration);
    });
    next();
  }
}
