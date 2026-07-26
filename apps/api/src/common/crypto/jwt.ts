import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export type JwtPayload = {
  sub: string;
  role: string;
  /** Token type — access tokens must never be accepted where a refresh token is expected. */
  typ: "access" | "refresh";
  /** Refresh-token rotation family; present on refresh tokens only. */
  fam?: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
};

export type SignOptions = {
  secret: string;
  issuer: string;
  audience: string;
  expiresInSeconds: number;
};

export class JwtError extends Error {
  constructor(
    message: string,
    readonly code:
      | "MALFORMED"
      | "BAD_ALGORITHM"
      | "BAD_SIGNATURE"
      | "EXPIRED"
      | "NOT_YET_VALID"
      | "BAD_ISSUER"
      | "BAD_AUDIENCE"
      | "BAD_TYPE",
  ) {
    super(message);
    this.name = "JwtError";
  }
}

const ALGORITHM = "HS256";

/** Small clock-skew allowance so a slightly fast client isn't rejected outright. */
const CLOCK_SKEW_SECONDS = 30;

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="), "base64");
}

function sign(signingInput: string, secret: string): string {
  return base64UrlEncode(createHmac("sha256", secret).update(signingInput).digest());
}

export type IssueTokenInput = {
  subject: string;
  role: string;
  type: "access" | "refresh";
  family?: string;
};

export function issueToken(input: IssueTokenInput, options: SignOptions): { token: string; payload: JwtPayload } {
  const issuedAt = Math.floor(Date.now() / 1000);

  const payload: JwtPayload = {
    sub: input.subject,
    role: input.role,
    typ: input.type,
    iss: options.issuer,
    aud: options.audience,
    iat: issuedAt,
    exp: issuedAt + options.expiresInSeconds,
    jti: randomUUID(),
    ...(input.family ? { fam: input.family } : {}),
  };

  const header = base64UrlEncode(JSON.stringify({ alg: ALGORITHM, typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;

  return { token: `${signingInput}.${sign(signingInput, options.secret)}`, payload };
}

export type VerifyOptions = {
  secret: string;
  issuer: string;
  audience: string;
  /** When set, a token whose `typ` differs is rejected. */
  expectedType?: "access" | "refresh";
};

/**
 * Verifies a JWT properly: pinned algorithm, constant-time signature check,
 * then issuer / audience / type / expiry claims. Throws `JwtError` on any
 * failure — there is no path that returns a payload for an unverified token.
 */
export function verifyToken(token: unknown, options: VerifyOptions): JwtPayload {
  if (typeof token !== "string" || token.length === 0) {
    throw new JwtError("Token must be a non-empty string", "MALFORMED");
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new JwtError("Token must have three segments", "MALFORMED");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  let header: { alg?: unknown; typ?: unknown };

  try {
    header = JSON.parse(base64UrlDecode(encodedHeader).toString("utf8"));
  } catch {
    throw new JwtError("Token header is not valid JSON", "MALFORMED");
  }

  // Pin the algorithm. Accepting `alg` from the token is the classic
  // "alg: none" / HMAC-vs-RSA confusion bypass.
  if (header.alg !== ALGORITHM) {
    throw new JwtError(`Unsupported algorithm: ${String(header.alg)}`, "BAD_ALGORITHM");
  }

  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`, options.secret);
  const provided = Buffer.from(encodedSignature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new JwtError("Signature verification failed", "BAD_SIGNATURE");
  }

  let payload: JwtPayload;

  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8"));
  } catch {
    throw new JwtError("Token payload is not valid JSON", "MALFORMED");
  }

  const now = Math.floor(Date.now() / 1000);

  if (typeof payload.exp !== "number" || now > payload.exp + CLOCK_SKEW_SECONDS) {
    throw new JwtError("Token has expired", "EXPIRED");
  }

  if (typeof payload.iat !== "number" || payload.iat > now + CLOCK_SKEW_SECONDS) {
    throw new JwtError("Token was issued in the future", "NOT_YET_VALID");
  }

  if (payload.iss !== options.issuer) {
    throw new JwtError("Unexpected issuer", "BAD_ISSUER");
  }

  if (payload.aud !== options.audience) {
    throw new JwtError("Unexpected audience", "BAD_AUDIENCE");
  }

  if (options.expectedType && payload.typ !== options.expectedType) {
    throw new JwtError(`Expected a ${options.expectedType} token`, "BAD_TYPE");
  }

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new JwtError("Token is missing a subject", "MALFORMED");
  }

  return payload;
}
