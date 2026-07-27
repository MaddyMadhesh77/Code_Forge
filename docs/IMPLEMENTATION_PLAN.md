Overview
========

This document records the initial implementation choices for the Code Forge enterprise features requested by the product team.

For the frontend implementation blueprint, see [docs/FRONTEND_IMPLEMENTATION_BLUEPRINT.md](FRONTEND_IMPLEMENTATION_BLUEPRINT.md).

Goals implemented in this change set
- Observability: basic Prometheus/Grafana docker-compose and a NestJS metrics endpoint.
- Audit logging: lightweight NestJS middleware to capture tenant, user, request, and outcome.
- Job queue: starter Bull module with a dead-letter queue (DLQ) and retry policy.
- Sandbox safety: guidance and image pinning recommendation (operational guidance only).
- Data retention: API surface and policies described; retention controller scaffold recommended.
- GTM: two minimal React components for a branded candidate page and a fast trial flow.

How to use
- Bring up the observability stack using `infra/observability/docker-compose.observability.yml`.
- Register `MetricsModule` in `apps/api` to expose `/metrics` for Prometheus scraping.
- Add `AuditMiddleware` to the global middleware stack to start emitting audit events to stdout (log forwarder recommended).
- Wire `QueueModule` with your Redis connection in production for job retries and DLQ handling.

Design choices (why these)
- Lightweight, observable-first: get metrics and alerts quickly before implementing full distributed tracing.
- Simple audit stream to stdout: easy to forward to any centralized store (ELK/ClickHouse/Snowflake).
- Queue with DLQ: reliable retry semantics without complex orchestration.
- UI components are intentionally minimal; they provide a starting point for brand templating and quick trial onboarding.

Next steps
- Add Prometheus scrape targets and Grafana dashboards for latency, error rates, and reconnect metrics.
- Add an audit-forwarder that writes to an append-only, tenant-indexed store with retention controls.
- Expand sandbox hardening with OCI image signing, restricted networking, and seccomp profiles.
- Implement a retention API and scheduled enforcement job per-tenant.
