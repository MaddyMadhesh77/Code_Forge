import { Request, Response, NextFunction } from 'express';

import { AuditForwarder } from '../../services/audit-forwarder.service.js';

export class AuditMiddleware {
  forwarder?: AuditForwarder;

  constructor(forwarder?: AuditForwarder) {
    this.forwarder = forwarder;
  }

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const tenant = (req.headers['x-tenant-id'] as string) || 'unknown';
    const user = (req.headers['x-user-id'] as string) || (req as any).user?.id || 'anonymous';

    res.on('finish', () => {
      const duration = Date.now() - start;
      const entry = {
        timestamp: new Date().toISOString(),
        tenant,
        user,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration_ms: duration,
      };
      // Emit to stdout for immediate visibility
      // eslint-disable-next-line no-console
      console.log('AUDIT_EVENT', JSON.stringify(entry));
      // Forward to append-only tenant log in the background
      this.forwarder?.forward(entry).catch(() => {});
    });

    next();
  }
}

