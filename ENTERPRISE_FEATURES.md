# Code Forge Enterprise Features Implementation

## Overview

This implementation adds enterprise-grade observability, multi-tenant audit logging, job queue reliability, data retention controls, and GTM-ready features to Code Forge.

## Features Implemented

### 1. Full Observability Stack
- **Prometheus metrics** (`/metrics`): CPU, memory, HTTP latencies, error rates, DLQ counts
- **Grafana dashboard**: Pre-configured visualization for key SLOs
- **Alert rules**: High DLQ rate, high error rate, high latency
- **Docker Compose**: Single-file setup for Prometheus + Grafana

**Usage:**
```bash
docker-compose -f infra/observability/docker-compose.observability.yml up
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/changeme)
```

### 2. Multi-Tenant Audit Logging
- **HTTP audit middleware**: Captures tenant, user, method, path, status, duration
- **Append-only logs**: Tenant-indexed files (e.g., `data/audit/tenant_abc.log`)
- **Operator endpoints**: `/operator/audit/:tenant` to retrieve audit history
- **Stdout emit**: All events logged to console for log forwarders (ELK, Datadog, etc.)

**Usage:**
```bash
curl -H "x-tenant-id: acme" http://localhost:4000/operator/audit/acme
```

### 3. Job Queue with Dead-Letter Queue (DLQ)
- **Bull queue**: Exponential backoff retry (3 attempts by default)
- **Automatic DLQ**: Jobs that exhaust retries move to a separate queue for operator review
- **Operator endpoints**: `/operator/dlq` for counts, `/operator/dlq/recent` for failed jobs

**Usage:**
```bash
curl http://localhost:4000/operator/dlq
# Returns: { queue: { waiting, active, delayed, failed, completed }, dlq: { ... } }
```

### 4. Data Retention & Deletion Controls
- **RetentionService**: Automatically deletes audit files older than N days (default: 90)
- **Daily enforcement**: Runs daily via interval job
- **Per-tenant granular control**: Configurable via `AUDIT_RETENTION_DAYS` env var

**Usage:**
```bash
export AUDIT_RETENTION_DAYS=30
npm run dev  # Retention enforcement runs daily in the background
```

### 5. Operator Dashboard
- **React component**: `OperatorDashboard` in `packages/interview-ui`
- **DLQ inspection**: View queue stats and recent failed jobs
- **Audit log tail**: Retrieve and inspect per-tenant audit history
- **Real-time refresh**: Buttons to reload data on demand

**Import:**
```tsx
import { OperatorDashboard } from '@codeforge/interview-ui';
export default OperatorDashboard;
```

### 6. Branded Candidate Experience Pages
- **`BrandedCandidatePage`**: Customizable interview entry point
- **`FastTrial`**: Quick onboarding flow (create account → invite teammate → run interview)
- **Props**: `brandName`, `logoUrl`, `candidateName`, `onStart` callback

**Import:**
```tsx
import { BrandedCandidatePage, FastTrial } from '@codeforge/interview-ui';
```

### 7. Public API & Webhooks
- **Webhook registration**: `POST /api/webhooks` with `url` and `events`
- **List webhooks**: `GET /api/webhooks`
- **Delete webhook**: `DELETE /api/webhooks/:id`
- **Async delivery**: Events fire to registered endpoints in the background

**Usage:**
```bash
curl -X POST http://localhost:4000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"url":"https://ats.example.com/hook","events":["interview.completed","interview.failed"]}'
```

## HTTP Endpoints

### Health & Metrics
- `GET /health` - Server status and uptime
- `GET /metrics` - Prometheus format metrics
- `GET /ready` - Readiness probe

### Operator
- `GET /operator/dlq` - Queue and DLQ job counts
- `GET /operator/dlq/recent` - Last 50 DLQ jobs with failure reasons
- `GET /operator/audit/:tenant?limit=200` - Audit log tail for a tenant

### Public API
- `POST /api/webhooks` - Register webhook (`x-tenant-id` header required)
- `GET /api/webhooks` - List webhooks
- `DELETE /api/webhooks/:id` - Remove webhook

## Environment Variables

```bash
PORT=4000                          # HTTP server port
REDIS_URL=redis://localhost:6379   # Redis for Bull queues
AUDIT_RETENTION_DAYS=90            # Delete audit logs older than N days
```

## Architecture

### Middleware Stack
1. **MetricsMiddleware**: Records HTTP request metrics (latency, error count)
2. **AuditMiddleware**: Captures tenant/user context and request details
3. **Express routing**: REST/Webhook endpoints

### Services
- **AuditForwarder**: Writes audit events to append-only tenant log files
- **RetentionService**: Daily job to delete expired audit logs
- **PublicAPIService**: In-memory webhook registry and async event dispatcher
- **QueueModule**: Bull + DLQ for reliable job processing

### Data Flow
1. Request arrives → MetricsMiddleware records metrics
2. Request arrives → AuditMiddleware captures context
3. Response sent → Audit event written to `data/audit/{tenant}.log`
4. Prometheus scrapes `/metrics` every 15s (configurable)
5. Grafana pulls from Prometheus and renders dashboards
6. Operators access `/operator/*` endpoints to inspect state
7. Daily: RetentionService enforces audit deletion policy

## Next Steps (Recommended Priority)

1. **Wire Elasticsearch**: Replace append-only files with ELK for distributed search
2. **Add distributed tracing**: Integrate Jaeger/Tempo for cross-service observability
3. **SSO & SCIM**: Enterprise authentication (OIDC + group provisioning)
4. **API versioning**: RESTful API versioning strategy
5. **Rate limiting**: Per-tenant request quotas
6. **Sandbox hardening**: OCI image signing, seccomp profiles, network isolation

## Testing

```bash
# Build API
cd apps/api
npm run build

# Start HTTP server (development)
npm run dev

# Run E2E tests
npm run test

# Check health
curl http://localhost:4000/health
```

## Troubleshooting

**Metrics endpoint returns 500:**
- Ensure `prom-client` is installed: `pnpm add prom-client`
- Check console for middleware errors

**Audit logs not appearing:**
- Verify `x-tenant-id` header is set on requests
- Check `data/audit/` directory permissions

**DLQ growing indefinitely:**
- Inspect recent jobs: `curl http://localhost:4000/operator/dlq/recent`
- Fix worker code or increase retry attempts in `queue.module.ts`

**Webhooks not firing:**
- Verify endpoint is publicly accessible
- Check logs for "webhook failed" messages
- Ensure events match registered webhook filters
