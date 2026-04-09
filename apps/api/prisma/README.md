# Prisma Bootstrap Notes

- Schema file: `apps/api/prisma/schema.prisma`
- Migration scaffold: `apps/api/prisma/migrations/20260424_init/migration.sql`
- Seed sample: `apps/api/prisma/seed.json`

Typical commands:

- `pnpm --filter @codeforge/api prisma:generate`
- `pnpm --filter @codeforge/api prisma:migrate`

The migration SQL here is a baseline scaffold and should be replaced with generated Prisma migrations once dependencies are installed.
