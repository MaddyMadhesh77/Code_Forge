# Quick Start: Enterprise Features

## 1. Install Dependencies

```bash
cd apps/api
pnpm install
```

This will install:
- `express` - HTTP server
- `prom-client` - Prometheus metrics
- `bull` - Job queue with DLQ
- `@types/express` - TypeScript types

## 2. Start the HTTP Server (Development)

```bash
cd apps/api
PORT=4000 npm run dev
```

The server will start on `http://localhost:4000` and expose:
- Health check: `GET /health`
- Metrics: `GET /metrics` (Prometheus format)
- Operator endpoints: `/operator/dlq`, `/operator/audit/:tenant`
- Public API: `/api/webhooks`

## 3. Start Observability Stack (Optional)

In a new terminal:

```bash
docker-compose -f infra/observability/docker-compose.observability.yml up
```

This brings up:
- **Prometheus** on `http://localhost:9090`
- **Grafana** on `http://localhost:3001` (admin/changeme)

To view metrics:
1. Open Grafana (http://localhost:3001)
2. Add Prometheus as a data source: `http://host.docker.internal:9090`
3. Import the dashboard from `infra/observability/grafana-dashboard-codeforge.json`

## 4. Test Audit Logging

```bash
# Make a request with tenant header
curl -H "x-tenant-id: acme" http://localhost:4000/health

# Retrieve audit logs
curl http://localhost:4000/operator/audit/acme

# Check audit file directly
cat data/audit/acme.log
```

## 5. Test Webhooks (ATS Integration)

```bash
# Start a simple webhook listener (example)
npx http-server --cors -p 8888

# Register webhook
curl -X POST http://localhost:4000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: acme" \
  -d '{"url":"http://localhost:8888/hook","events":["interview.completed"]}'

# List webhooks
curl http://localhost:4000/api/webhooks
```

## 6. Deploy to Production

### Environment Variables

```bash
export PORT=3000
export REDIS_URL=redis://redis.internal:6379
export AUDIT_RETENTION_DAYS=90
npm run dev
```

### Docker

Build and push:
```bash
docker build -f apps/api/Dockerfile -t my-registry/codeforge-api:v1 .
docker push my-registry/codeforge-api:v1
```

Run:
```bash
docker run -e PORT=3000 -e REDIS_URL=redis://... -p 3000:3000 my-registry/codeforge-api:v1
```

### Kubernetes

See `docker-compose.prod.yml` for production defaults.

```bash
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codeforge-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: codeforge-api
  template:
    metadata:
      labels:
        app: codeforge-api
    spec:
      containers:
      - name: api
        image: my-registry/codeforge-api:v1
        ports:
        - containerPort: 3000
        env:
        - name: PORT
          value: "3000"
        - name: REDIS_URL
          value: "redis://redis-svc:6379"
        - name: AUDIT_RETENTION_DAYS
          value: "90"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
EOF
```

## Verification Checklist

- [ ] HTTP server starts on port 4000
- [ ] `/health` returns `{ status: ok }`
- [ ] `/metrics` returns Prometheus data
- [ ] `/operator/dlq` returns queue stats
- [ ] Request with `x-tenant-id` header creates `data/audit/{tenant}.log`
- [ ] Webhooks can be registered via `POST /api/webhooks`
- [ ] Grafana dashboard loads with charts
- [ ] Alerts fire when thresholds are crossed

## Support

- Review `ENTERPRISE_FEATURES.md` for architecture details
- Check console logs for errors
- Inspect `data/audit/` directory for audit events
- Use `/operator/*` endpoints to debug issues
