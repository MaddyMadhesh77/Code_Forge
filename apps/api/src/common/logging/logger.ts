export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function resolveMinLevel(): LogLevel {
  const configured = (process.env.LOG_LEVEL ?? "").toLowerCase();

  if (configured in LEVEL_ORDER) {
    return configured as LogLevel;
  }

  return process.env.NODE_ENV === "test" ? "error" : "info";
}

/** Redacted before anything reaches stdout, wherever it appears in a context object. */
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "cookie",
  "secret",
  "clientsecret",
  "apikey",
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((entry) => redact(entry, depth + 1));
  }

  const output: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    output[key] = SENSITIVE_KEYS.has(key.toLowerCase().replace(/[-_]/g, ""))
      ? "[redacted]"
      : redact(entry, depth + 1);
  }

  return output;
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error.cause ? { cause: String(error.cause) } : {}),
    };
  }

  return { message: String(error) };
}

export type LogContext = Record<string, unknown> & { err?: unknown };

/**
 * Minimal structured logger emitting one JSON object per line.
 *
 * It exists so failures have somewhere to go: the codebase previously used
 * `.catch(() => {})` in several places, which made real errors invisible.
 */
export class Logger {
  private readonly minLevel: LogLevel;

  constructor(
    private readonly context: string = "app",
    minLevel: LogLevel = resolveMinLevel(),
  ) {
    this.minLevel = minLevel;
  }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`, this.minLevel);
  }

  debug(message: string, context?: LogContext): void {
    this.write("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.write("error", message, context);
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) {
      return;
    }

    const { err, ...rest } = context ?? {};

    const entry = {
      level,
      time: new Date().toISOString(),
      context: this.context,
      message,
      ...(redact(rest) as Record<string, unknown>),
      ...(err ? { error: serializeError(err) } : {}),
    };

    const line = JSON.stringify(entry);

    // eslint-disable-next-line no-console
    if (level === "error") console.error(line);
    // eslint-disable-next-line no-console
    else if (level === "warn") console.warn(line);
    // eslint-disable-next-line no-console
    else console.log(line);
  }
}

export const logger = new Logger("codeforge-api");
