import { randomBytes } from "node:crypto";
import { z } from "zod";

/**
 * Every secret this process needs is declared here and validated once at
 * boot. Nothing elsewhere reads `process.env` for a credential, so there is a
 * single place to audit for "does this ship with a default?".
 */

const MIN_SECRET_LENGTH = 32;

const booleanish = z
  .string()
  .transform((value) => ["1", "true", "yes", "on"].includes(value.trim().toLowerCase()));

const csv = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),

  JWT_ACCESS_SECRET: z.string().min(MIN_SECRET_LENGTH).optional(),
  JWT_REFRESH_SECRET: z.string().min(MIN_SECRET_LENGTH).optional(),
  JWT_ISSUER: z.string().default("codeforge-api"),
  JWT_AUDIENCE: z.string().default("codeforge-web"),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 30),

  CORS_ALLOWED_ORIGINS: csv.default("http://localhost:5173,http://localhost:3000"),
  TRUST_PROXY: booleanish.default("false"),
  BODY_LIMIT: z.string().default("256kb"),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  AUDIT_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  AUDIT_DIR: z.string().optional(),

  OIDC_ISSUER: z.string().url().optional(),
  OIDC_CLIENT_ID: z.string().min(1).optional(),
  OIDC_CLIENT_SECRET: z.string().min(1).optional(),
  OIDC_REDIRECT_URI: z.string().url().optional(),

  SCIM_BEARER_TOKEN: z.string().min(MIN_SECRET_LENGTH).optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("no-reply@codeforge.local"),

  WEBHOOK_SIGNING_SECRET: z.string().min(MIN_SECRET_LENGTH).optional(),
  PUPPETEER_POOL_SIZE: z.coerce.number().int().min(1).max(8).default(2),
});

export type RawEnv = z.infer<typeof envSchema>;

export type AppConfig = {
  nodeEnv: "development" | "test" | "production";
  isProduction: boolean;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    issuer: string;
    audience: string;
    accessTtlSeconds: number;
    refreshTtlSeconds: number;
  };
  http: {
    corsAllowedOrigins: string[];
    trustProxy: boolean;
    bodyLimit: string;
    rateLimitWindowMs: number;
    rateLimitMax: number;
    authRateLimitMax: number;
  };
  audit: {
    retentionDays: number;
    dir?: string;
  };
  oidc:
    | {
        enabled: true;
        issuer: string;
        clientId: string;
        clientSecret: string;
        redirectUri: string;
      }
    | { enabled: false };
  scim: { enabled: boolean; bearerToken?: string };
  smtp:
    | { enabled: true; host: string; port: number; user: string; pass: string; from: string }
    | { enabled: false; from: string };
  webhookSigningSecret?: string;
  puppeteerPoolSize: number;
};

export class ConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid configuration:\n  - ${problems.join("\n  - ")}`);
    this.name = "ConfigError";
  }
}

/**
 * Dev/test convenience only: a random per-process secret so local runs work
 * without a .env, while every token dies with the process. Production never
 * reaches this — `loadConfig` hard-fails instead.
 */
function ephemeralSecret(label: string): string {
  const secret = randomBytes(48).toString("hex");
  // eslint-disable-next-line no-console
  console.warn(
    `[config] ${label} is not set; generated an ephemeral secret for this process. ` +
      "Tokens will not survive a restart. Set it explicitly for anything but local development.",
  );
  return secret;
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    throw new ConfigError(
      parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    );
  }

  const env = parsed.data;
  const isProduction = env.NODE_ENV === "production";
  const problems: string[] = [];

  // In production every secret must be supplied. No fallbacks, no defaults —
  // a missing secret stops the boot rather than silently weakening auth.
  if (isProduction) {
    if (!env.DATABASE_URL) problems.push("DATABASE_URL is required in production");
    if (!env.JWT_ACCESS_SECRET) {
      problems.push(`JWT_ACCESS_SECRET is required in production (min ${MIN_SECRET_LENGTH} chars)`);
    }
    if (!env.JWT_REFRESH_SECRET) {
      problems.push(`JWT_REFRESH_SECRET is required in production (min ${MIN_SECRET_LENGTH} chars)`);
    }
    if (env.JWT_ACCESS_SECRET && env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      problems.push("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values");
    }
    if (env.CORS_ALLOWED_ORIGINS.includes("*")) {
      problems.push("CORS_ALLOWED_ORIGINS must not contain '*' in production");
    }
  }

  // OIDC is all-or-nothing: a partially configured client used to fall back to
  // the literal string 'client_secret'.
  const oidcFields = [
    env.OIDC_ISSUER,
    env.OIDC_CLIENT_ID,
    env.OIDC_CLIENT_SECRET,
    env.OIDC_REDIRECT_URI,
  ];
  const oidcProvided = oidcFields.filter(Boolean).length;

  if (oidcProvided > 0 && oidcProvided < oidcFields.length) {
    problems.push(
      "OIDC is partially configured; set all of OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI or none",
    );
  }

  const smtpFields = [env.SMTP_HOST, env.SMTP_PORT, env.SMTP_USER, env.SMTP_PASS];
  const smtpProvided = smtpFields.filter((value) => value !== undefined).length;

  if (smtpProvided > 0 && smtpProvided < smtpFields.length) {
    problems.push(
      "SMTP is partially configured; set all of SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS or none",
    );
  }

  if (problems.length > 0) {
    throw new ConfigError(problems);
  }

  return {
    nodeEnv: env.NODE_ENV,
    isProduction,
    port: env.PORT,
    databaseUrl:
      env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5433/codeforge?schema=public",
    redisUrl: env.REDIS_URL,
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET ?? ephemeralSecret("JWT_ACCESS_SECRET"),
      refreshSecret: env.JWT_REFRESH_SECRET ?? ephemeralSecret("JWT_REFRESH_SECRET"),
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
      refreshTtlSeconds: env.JWT_REFRESH_TTL_SECONDS,
    },
    http: {
      corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS,
      trustProxy: env.TRUST_PROXY,
      bodyLimit: env.BODY_LIMIT,
      rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
      rateLimitMax: env.RATE_LIMIT_MAX,
      authRateLimitMax: env.AUTH_RATE_LIMIT_MAX,
    },
    audit: {
      retentionDays: env.AUDIT_RETENTION_DAYS,
      dir: env.AUDIT_DIR,
    },
    oidc:
      oidcProvided === oidcFields.length
        ? {
            enabled: true,
            issuer: env.OIDC_ISSUER!,
            clientId: env.OIDC_CLIENT_ID!,
            clientSecret: env.OIDC_CLIENT_SECRET!,
            redirectUri: env.OIDC_REDIRECT_URI!,
          }
        : { enabled: false },
    scim: { enabled: Boolean(env.SCIM_BEARER_TOKEN), bearerToken: env.SCIM_BEARER_TOKEN },
    smtp:
      smtpProvided === smtpFields.length
        ? {
            enabled: true,
            host: env.SMTP_HOST!,
            port: env.SMTP_PORT!,
            user: env.SMTP_USER!,
            pass: env.SMTP_PASS!,
            from: env.SMTP_FROM,
          }
        : { enabled: false, from: env.SMTP_FROM },
    webhookSigningSecret: env.WEBHOOK_SIGNING_SECRET,
    puppeteerPoolSize: env.PUPPETEER_POOL_SIZE,
  };
}

let cached: AppConfig | undefined;

/** Process-wide config, parsed on first access. */
export function getConfig(): AppConfig {
  cached ??= loadConfig();
  return cached;
}

/** Test hook — lets a suite install a config without mutating process.env. */
export function setConfigForTesting(config: AppConfig | undefined): void {
  cached = config;
}
