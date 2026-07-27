import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * scrypt parameters. N=2^15 keeps a single hash around ~100ms on commodity
 * hardware, which is the usual target for an interactive login.
 */
const PARAMS = { N: 32768, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** maxmem must exceed 128 * N * r or scrypt refuses to run. */
const MAX_MEM = 128 * PARAMS.N * PARAMS.r * 2;

const PREFIX = "scrypt";

export class PasswordHashError extends Error {}

/**
 * Hashes a plaintext password into a self-describing string:
 * `scrypt$N$r$p$<base64 salt>$<base64 derived key>`.
 *
 * Embedding the parameters means stored hashes stay verifiable after we raise
 * the cost factor, and `needsRehash` can spot the outdated ones.
 */
export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== "string" || password.length === 0) {
    throw new PasswordHashError("Password must be a non-empty string");
  }

  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, {
    ...PARAMS,
    maxmem: MAX_MEM,
  });

  return [
    PREFIX,
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

type ParsedHash = {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  key: Buffer;
};

function parseHash(stored: string): ParsedHash | null {
  const parts = stored.split("$");

  if (parts.length !== 6 || parts[0] !== PREFIX) {
    return null;
  }

  const [, rawN, rawR, rawP, rawSalt, rawKey] = parts;
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);

  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return null;
  }

  // Guard against a malicious/corrupt row driving us into an OOM.
  if (N < 1024 || N > 1_048_576 || r < 1 || r > 32 || p < 1 || p > 16) {
    return null;
  }

  try {
    return {
      N,
      r,
      p,
      salt: Buffer.from(rawSalt, "base64"),
      key: Buffer.from(rawKey, "base64"),
    };
  } catch {
    return null;
  }
}

/**
 * Constant-time password check. Returns false for unparseable hashes rather
 * than throwing, so a corrupt row can never be coerced into an auth bypass.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (typeof password !== "string" || typeof stored !== "string") {
    return false;
  }

  const parsed = parseHash(stored);

  if (!parsed) {
    return false;
  }

  const derived = await scrypt(password.normalize("NFKC"), parsed.salt, parsed.key.length, {
    N: parsed.N,
    r: parsed.r,
    p: parsed.p,
    maxmem: 128 * parsed.N * parsed.r * 2,
  });

  if (derived.length !== parsed.key.length) {
    return false;
  }

  return timingSafeEqual(derived, parsed.key);
}

/** True when a stored hash predates the current cost parameters. */
export function needsRehash(stored: string): boolean {
  const parsed = parseHash(stored);

  if (!parsed) {
    return true;
  }

  return parsed.N < PARAMS.N || parsed.r < PARAMS.r || parsed.p < PARAMS.p;
}
