/**
 * Test environment defaults.
 *
 * Set before any module reads config, so `loadConfig` sees deterministic
 * secrets rather than minting a random one per process (which would make
 * token assertions unrepeatable).
 */
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL ??= "error";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-value-000000000000000000";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-value-11111111111111111";
process.env.JWT_ISSUER ??= "codeforge-api-test";
process.env.JWT_AUDIENCE ??= "codeforge-web-test";
process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5433/codeforge?schema=public";
