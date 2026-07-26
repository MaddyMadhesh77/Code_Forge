import type { NextFunction, Request, RequestHandler, Response } from "express";

import { getConfig, type AppConfig } from "../../config/env.js";
import { JwtError, verifyToken, type JwtPayload } from "../crypto/jwt.js";
import { UnauthorizedError } from "../errors/app-error.js";

export type AuthenticatedUser = {
  id: string;
  role: string;
  tokenId: string;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
    }
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;

  if (typeof header !== "string") {
    return null;
  }

  // Case-insensitive scheme, single space, three base64url segments.
  const match = /^Bearer[ ]([\w-]+\.[\w-]+\.[\w-]+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

/**
 * Authenticates a request from its `Authorization: Bearer <jwt>` header.
 *
 * The previous implementation was an empty class, and the OIDC variant
 * accepted *any* Bearer header and attached a hardcoded `user_123`. This one
 * verifies the signature and every registered claim, and rejects anything it
 * cannot prove.
 */
export class JwtAuthGuard {
  constructor(private readonly config: AppConfig = getConfig()) {}

  /** Verifies the token or throws; returns the authenticated principal. */
  authenticate(req: Request): AuthenticatedUser {
    const token = extractBearerToken(req);

    if (!token) {
      throw new UnauthorizedError("Missing or malformed Authorization header", "MISSING_TOKEN");
    }

    let claims: JwtPayload;

    try {
      claims = verifyToken(token, {
        secret: this.config.jwt.accessSecret,
        issuer: this.config.jwt.issuer,
        audience: this.config.jwt.audience,
        expectedType: "access",
      });
    } catch (error) {
      if (error instanceof JwtError) {
        // `EXPIRED` is distinguished so clients know to refresh rather than
        // re-prompt for credentials. Other reasons stay deliberately vague.
        throw new UnauthorizedError(
          error.code === "EXPIRED" ? "Access token has expired" : "Invalid access token",
          error.code === "EXPIRED" ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
        );
      }
      throw error;
    }

    return { id: claims.sub, role: claims.role, tokenId: claims.jti };
  }

  /** Express middleware form: attaches `req.user` or rejects with 401. */
  canActivate(): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction) => {
      try {
        req.user = this.authenticate(req);
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Attaches `req.user` when a valid token is present but does not reject
   * anonymous requests. For endpoints that vary their response by viewer.
   */
  optional(): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction) => {
      try {
        req.user = this.authenticate(req);
      } catch {
        req.user = undefined;
      }
      next();
    };
  }
}
