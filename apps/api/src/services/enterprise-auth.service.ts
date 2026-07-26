import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { getConfig, type AppConfig } from "../config/env.js";
import { BadRequestError, ServiceUnavailableError, UnauthorizedError } from "../common/errors/app-error.js";
import { logger } from "../common/logging/logger.js";
import { PrismaService } from "../database/prisma.service.js";

const log = logger.child("EnterpriseAuth");

export type OidcConfig = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type AuthorizationRequest = {
  authUrl: string;
  state: string;
  /** PKCE verifier the caller must hold until the callback. */
  codeVerifier: string;
  nonce: string;
};

export type OidcTokens = {
  accessToken: string;
  idToken: string;
  expiresIn: number;
};

const STATE_TTL_MS = 10 * 60 * 1000;
const TOKEN_REQUEST_TIMEOUT_MS = 10_000;

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

/**
 * OIDC authorization-code client with PKCE.
 *
 * Two things changed from the previous version. It no longer falls back to
 * literal `'client_id'` / `'client_secret'` defaults — an unconfigured client
 * refuses to operate rather than shipping placeholder credentials. And
 * `verifyToken`, which used to accept any Bearer header and attach a
 * hardcoded `user_123`, is gone entirely; first-party requests are
 * authenticated by `JwtAuthGuard` against tokens we issued ourselves.
 */
export class OIDCClient {
  /** Pending authorization requests, keyed by a hash of `state`. */
  private readonly pending = new Map<
    string,
    { codeVerifier: string; nonce: string; expiresAt: number }
  >();

  constructor(private readonly config: OidcConfig | null) {}

  static fromAppConfig(appConfig: AppConfig = getConfig()): OIDCClient {
    return new OIDCClient(appConfig.oidc.enabled ? appConfig.oidc : null);
  }

  get enabled(): boolean {
    return this.config !== null;
  }

  private requireConfig(): OidcConfig {
    if (!this.config) {
      throw new ServiceUnavailableError(
        "OIDC is not configured. Set OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET and OIDC_REDIRECT_URI.",
        "OIDC_NOT_CONFIGURED",
      );
    }

    return this.config;
  }

  /**
   * Builds an authorization URL with a CSPRNG `state` and a PKCE challenge.
   * `state` is retained server-side so the callback can prove the response
   * belongs to a request we actually made.
   */
  createAuthorizationRequest(): AuthorizationRequest {
    const config = this.requireConfig();
    this.sweepExpired();

    const state = base64url(randomBytes(32));
    const nonce = base64url(randomBytes(16));
    const codeVerifier = base64url(randomBytes(32));
    const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());

    this.pending.set(hashState(state), {
      codeVerifier,
      nonce,
      expiresAt: Date.now() + STATE_TTL_MS,
    });

    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: "code",
      scope: "openid profile email",
      redirect_uri: config.redirectUri,
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return {
      authUrl: `${config.issuer}/authorize?${params.toString()}`,
      state,
      codeVerifier,
      nonce,
    };
  }

  /**
   * Exchanges an authorization code for tokens after validating `state`.
   *
   * The pending entry is consumed on first use, so a replayed callback fails.
   */
  async exchangeCodeForToken(code: string, state: string): Promise<OidcTokens> {
    const config = this.requireConfig();

    if (typeof code !== "string" || code.length === 0) {
      throw new BadRequestError("Missing authorization code", undefined, "MISSING_CODE");
    }

    const key = hashState(state);
    const entry = this.pending.get(key);
    this.pending.delete(key);

    if (!entry || entry.expiresAt <= Date.now()) {
      throw new UnauthorizedError("Invalid or expired state parameter", "INVALID_STATE");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TOKEN_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${config.issuer}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: config.redirectUri,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code_verifier: entry.codeVerifier,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        log.warn("OIDC token exchange rejected", { status: response.status });
        throw new UnauthorizedError("Token exchange failed", "OIDC_EXCHANGE_FAILED");
      }

      const body = (await response.json()) as {
        access_token?: string;
        id_token?: string;
        expires_in?: number;
      };

      if (!body.access_token || !body.id_token) {
        throw new UnauthorizedError("Token response was incomplete", "OIDC_EXCHANGE_FAILED");
      }

      return {
        accessToken: body.access_token,
        idToken: body.id_token,
        expiresIn: body.expires_in ?? 3600,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private sweepExpired(): void {
    const now = Date.now();

    for (const [key, entry] of this.pending) {
      if (entry.expiresAt <= now) {
        this.pending.delete(key);
      }
    }
  }
}

/** States are held hashed so the raw value isn't sitting in process memory. */
function hashState(state: string): string {
  return createHash("sha256").update(String(state)).digest("hex");
}

/**
 * SCIM 2.0 provisioning backed by the real users table.
 *
 * Previously two in-memory Maps, meaning every provisioned identity
 * disappeared on restart and drifted from the actual user records.
 */
export class SCIMProvider {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: { email: string; displayName?: string }) {
    if (!data?.email) {
      throw new BadRequestError("email is required", undefined, "MISSING_EMAIL");
    }

    const email = data.email.trim().toLowerCase();

    // Provisioned accounts get an unusable random password hash; they must
    // authenticate through the IdP, never with a local password.
    const user = await this.prisma.user.upsert({
      where: { email },
      create: {
        email,
        displayName: data.displayName || email,
        passwordHash: `scim-provisioned:${randomBytes(32).toString("hex")}`,
      },
      update: { displayName: data.displayName || undefined, isActive: true },
      select: { id: true, email: true, displayName: true, isActive: true },
    });

    log.info("SCIM user provisioned", { userId: user.id });
    return toScimUser(user);
  }

  async listUsers(filter?: string) {
    // Minimal SCIM filter support: `userName eq "value"` / `email eq "value"`.
    const match = filter ? /(?:userName|email)\s+eq\s+"([^"]+)"/i.exec(filter) : null;

    const rows = await this.prisma.user.findMany({
      where: match ? { email: match[1].toLowerCase() } : {},
      select: { id: true, email: true, displayName: true, isActive: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return rows.map(toScimUser);
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, displayName: true, isActive: true },
    });

    return user ? toScimUser(user) : null;
  }

  async updateUser(id: string, data: { active?: boolean; displayName?: string }): Promise<boolean> {
    const { count } = await this.prisma.user.updateMany({
      where: { id },
      data: {
        ...(data.active !== undefined ? { isActive: data.active } : {}),
        ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
      },
    });

    return count > 0;
  }

  /**
   * SCIM delete is a deprovision: the account is deactivated rather than
   * removed, so interview history and audit trails survive.
   */
  async deleteUser(id: string): Promise<boolean> {
    const { count } = await this.prisma.user.updateMany({
      where: { id },
      data: { isActive: false },
    });

    if (count > 0) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      log.info("SCIM user deprovisioned", { userId: id });
    }

    return count > 0;
  }

  getServiceProviderConfig() {
    return {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
      documentationUri: "https://codeforge.example.com/scim-docs",
      patch: { supported: true },
      bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
      filter: { supported: true, maxResults: 200 },
      changePassword: { supported: false },
      sort: { supported: false },
      etag: { supported: false },
      authenticationSchemes: [
        {
          name: "OAuth Bearer Token",
          description: "Authentication scheme using the OAuth Bearer Token",
          specUri: "http://www.ietf.org/rfc/rfc6750.txt",
          type: "oauthbearertoken",
          primary: true,
        },
      ],
    };
  }
}

function toScimUser(user: {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
}) {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: user.id,
    userName: user.email,
    displayName: user.displayName,
    active: user.isActive,
    emails: [{ value: user.email, primary: true }],
  };
}

/**
 * Guards the SCIM endpoints with a shared bearer token, compared in constant
 * time. When `SCIM_BEARER_TOKEN` is unset the endpoints refuse all traffic
 * rather than defaulting open.
 */
export function scimAuth(appConfig: AppConfig = getConfig()) {
  return (
    req: { headers: Record<string, unknown> },
    _res: unknown,
    next: (err?: Error) => void,
  ): void => {
    const expected = appConfig.scim.bearerToken;

    if (!expected) {
      next(
        new ServiceUnavailableError(
          "SCIM is not configured. Set SCIM_BEARER_TOKEN to enable provisioning.",
          "SCIM_NOT_CONFIGURED",
        ),
      );
      return;
    }

    const header = req.headers.authorization;
    const provided = typeof header === "string" ? header.replace(/^Bearer\s+/i, "") : "";
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);

    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      next(new UnauthorizedError("Invalid SCIM credentials", "INVALID_SCIM_TOKEN"));
      return;
    }

    next();
  };
}
