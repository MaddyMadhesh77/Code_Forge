# @codeforge/api

Express + Prisma API for CodeForge.

## Running locally

```bash
docker compose up -d postgres redis     # Postgres on :5433, Redis on :6379
cp .env.example .env                    # then fill in the JWT secrets
pnpm --filter @codeforge/api prisma:deploy
pnpm --filter @codeforge/api prisma:seed
pnpm --filter @codeforge/api dev
```

Seeded accounts (password `devpassword123`):

| Email                       | Role        |
| --------------------------- | ----------- |
| `candidate@codeforge.dev`   | CANDIDATE   |
| `interviewer@codeforge.dev` | INTERVIEWER |
| `admin@codeforge.dev`       | ADMIN       |

## Tests

```bash
pnpm --filter @codeforge/api test
```

Unit tests run standalone. The files under `test/` are integration tests and
need the Postgres container plus applied migrations; they create and clean up
their own rows.

## Architecture

`AppModule` (`src/app.module.ts`) is the composition root: it constructs every
dependency once and injects downward. `createApp` in `src/server/http.server.ts`
assembles middleware and mounts routers from `src/server/routes/`; it contains
no business logic.

Request path:

```
requestId → security headers → CORS → rate limit → content-type → body parse
  → response helpers → access log → timeout → metrics → audit
  → router (auth guard → role guard → validation → handler)
  → 404 handler → error handler
```

Data access goes through repositories (`*.repository.ts`), which are the only
modules that talk to Prisma. Services hold policy and authorization; routers
only translate HTTP.

### Configuration

Every setting is declared and validated in `src/config/env.ts`, parsed once at
boot. In production a missing `DATABASE_URL` or JWT secret stops startup rather
than falling back to a default. In development, unset JWT secrets generate an
ephemeral per-process value with a warning.

Partially-configured OIDC or SMTP is rejected: supply all of a group's
variables or none, so a half-configured integration cannot silently fall back
to placeholder credentials.

### Authentication

- Passwords: `scrypt` (N=32768, r=8, p=1) with a per-password salt, verified in
  constant time. Hashes are self-describing, so the cost factor can be raised
  and `needsRehash` upgrades old hashes on next login.
- Access/refresh tokens: HS256 JWTs. Verification pins the algorithm, compares
  signatures in constant time, and checks `exp`, `iat`, `iss`, `aud` and token
  type. There is no path that returns claims for an unverified token.
- Refresh tokens are stored as SHA-256 digests and rotate on use. Replaying a
  consumed token revokes the entire rotation family (theft detection).
- WebSocket connections are authenticated during the handshake; handlers use
  the verified principal, never a client-supplied `userId`.

### Authorization

`requireRoles(...)` runs after the JWT guard and enforces a hierarchy
(ADMIN > INTERVIEWER > CANDIDATE). An unauthenticated request fails closed with
401 rather than passing through. Resource-level checks (session membership, run
ownership, problem ownership) live in the services.

### Error handling

Handlers throw typed errors from `src/common/errors/app-error.ts`. The global
filter maps them — plus Zod and Prisma errors — to a consistent envelope:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "...", "requestId": "...", "details": [] } }
```

5xx responses never include internal messages. Async handlers are wrapped in
`asyncHandler` so a rejected promise reaches the filter instead of hanging the
request.

## Known limitations

- **`interview-product.service.ts` is still in-memory.** Templates, billing,
  ATS integrations, calibration and debug sessions live in module-level maps and
  arrays. They do not survive a restart and are not shared across replicas. The
  interview core — users, sessions, participants, submissions, execution runs,
  scorecards, notes, reports, recordings, anti-cheat events, session links — is
  fully persisted.
- **Rate limiting is per-process.** Behind multiple replicas the effective limit
  is `N × RATE_LIMIT_MAX`. Move to a Redis-backed counter before horizontal
  scaling.
- **The sandbox worker does not execute code.** `apps/sandbox-worker` returns a
  fixed ACCEPTED verdict. `ResourceCaps` provides the cgroup/Docker limits and a
  real enforcement loop (`/proc` sampling, SIGKILL on breach) for when it does.
- **Complexity analysis is a heuristic**, not a proof. It reports its own
  confidence and the structural signals behind each estimate. The review
  endpoint is labelled `analyzer: "static-rules"` — it performs no model
  inference despite the historical `ai-review.service.ts` filename.
- **The websocket gateway is not mounted.** `InterviewsGateway.register(server)`
  attaches it to any Socket.IO-compatible server, but no socket server is
  started; `socket.io` is not a dependency.
