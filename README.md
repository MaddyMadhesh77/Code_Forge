# CodeForge API Scaffold

CodeForge is a TypeScript backend scaffold for coding interview workflows.

This repository currently contains:

- API service (`apps/api`)
- Shared contracts package (`packages/shared`)
- Root monorepo config for pnpm + turbo
- Docker Compose for local Postgres/Redis + API service

## Implemented Features

### Core Backend Modules

The API is organized into feature modules under `apps/api/src/modules`:

- `auth`: register/login + token strategy scaffolding
- `users`: user profile and activation/deactivation flows
- `sessions`: interview session lifecycle and participant joins
- `problems`: problem listing and retrieval
- `execution`: submission queue and execution flow scaffolding
- `collaboration`: room presence and collaboration event scaffolding

### Platform and Infra

- Shared schemas/contracts in `packages/shared`
- Prisma schema and migration scaffold in `apps/api/prisma`
- Redis and Postgres local dependencies via Docker Compose
- Common cross-cutting utilities (guards, interceptors, filters, pipes)

### Runtime Notes

- API bootstrap is exposed from `apps/api/src/main.ts`
- App module wiring is defined in `apps/api/src/app.module.ts`
- A demo execution flow is initialized during bootstrap for local validation

## Project Structure

```text
apps/
  api/
    prisma/
    src/
      common/
      config/
      database/
      modules/
packages/
  shared/
```

## Repository Layout Notes

- `apps/api` contains the backend service and Prisma models
- `packages/shared` contains schemas and shared runtime contracts
- root files manage workspace coordination, Docker, and Turbo pipelines

## Prerequisites

Install these tools first:

1. Node.js 20+
2. npm
3. pnpm 9+
4. Docker Desktop
5. Git

If `pnpm` is missing:

```bash
npm install -g pnpm
```

## Environment Setup

1. Copy `.env.example` values to your runtime environment.
2. Ensure these values are set:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `APP_URL`
- `API_URL`

Example from `.env.example`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/codeforge
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=replace-me
JWT_REFRESH_SECRET=replace-me
APP_URL=http://localhost:3000
API_URL=http://localhost:4000
```

### Environment Variables At A Glance

- `DATABASE_URL`: PostgreSQL connection string used by the API and Prisma
- `REDIS_URL`: Redis connection string used by queued and realtime flows
- `JWT_ACCESS_SECRET`: signing secret for access tokens
- `JWT_REFRESH_SECRET`: signing secret for refresh tokens
- `APP_URL`: frontend base URL
- `API_URL`: backend base URL

## Install Dependencies

From repository root:

```bash
pnpm install
```

## Running the Stack

### 1) Start dependencies (Postgres + Redis)

```bash
docker compose up -d postgres redis
```

### 2) Prisma setup (API)

```bash
pnpm --filter @codeforge/api prisma:generate
pnpm --filter @codeforge/api prisma:migrate
```

### 3) Run the API in watch mode

```bash
pnpm --filter @codeforge/api dev
```

### 4) Verify types/lint

```bash
pnpm --filter @codeforge/api typecheck
pnpm --filter @codeforge/api lint
```

### 5) Run tests

```bash
pnpm test
```

## Docker-Based Full Run

To run full compose services defined in root compose file:

```bash
docker compose up --build
```

To stop:

```bash
docker compose down
```

## Build Commands

From root:

```bash
pnpm build
pnpm lint
pnpm typecheck
```

## Common Commands

- `pnpm install` - install workspace dependencies
- `pnpm --filter @codeforge/api dev` - run the API in watch mode
- `pnpm --filter @codeforge/api prisma:generate` - regenerate Prisma client output
- `pnpm --filter @codeforge/api prisma:migrate` - apply local database migrations

## Quick Start

If you just want the shortest path to a local run, use this sequence:

```bash
pnpm install
docker compose up -d postgres redis
pnpm --filter @codeforge/api prisma:generate
pnpm --filter @codeforge/api prisma:migrate
pnpm --filter @codeforge/api dev
```

## Troubleshooting

### `pnpm` command not found

Install globally:

```bash
npm install -g pnpm
```

### Prisma migration issues

- Confirm Postgres is running on port `5432`
- Verify `DATABASE_URL` is correct
- Re-run:

```bash
pnpm --filter @codeforge/api prisma:generate
pnpm --filter @codeforge/api prisma:migrate
```

### TypeScript deprecation config error

If you see TS5103 for `ignoreDeprecations`, use:

```json
"ignoreDeprecations": "5.0"
```

in tsconfig files for current TypeScript compatibility.

