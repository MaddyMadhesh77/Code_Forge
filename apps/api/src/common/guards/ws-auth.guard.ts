import { getConfig, type AppConfig } from "../../config/env.js";
import { JwtError, verifyToken } from "../crypto/jwt.js";
import { logger } from "../logging/logger.js";
import type { AuthenticatedUser } from "./jwt-auth.guard.js";

const log = logger.child("WsAuthGuard");

/**
 * The subset of a Socket.IO handshake this guard reads. Kept structural so the
 * guard is testable without standing up a real socket server.
 */
export type SocketLike = {
  id: string;
  handshake?: {
    auth?: Record<string, unknown>;
    query?: Record<string, unknown>;
    headers?: Record<string, unknown>;
  };
  data?: Record<string, unknown>;
  disconnect?: (close?: boolean) => void;
};

/**
 * Authenticates a WebSocket connection during the handshake.
 *
 * Sockets bypass the HTTP middleware chain, so without this an authenticated
 * REST surface still leaves the realtime channel wide open.
 */
export class WsAuthGuard {
  constructor(private readonly config: AppConfig = getConfig()) {}

  /**
   * Pulls the token from `auth.token` (preferred — not logged by proxies),
   * falling back to the query string and the Authorization header.
   */
  private extractToken(socket: SocketLike): string | null {
    const handshake = socket.handshake ?? {};
    const candidates = [
      handshake.auth?.token,
      handshake.auth?.accessToken,
      handshake.query?.token,
      typeof handshake.headers?.authorization === "string"
        ? handshake.headers.authorization.replace(/^Bearer\s+/i, "")
        : undefined,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.length > 0) {
        return candidate;
      }
    }

    return null;
  }

  /** Verifies the handshake, returning the principal or null. */
  authenticate(socket: SocketLike): AuthenticatedUser | null {
    const token = this.extractToken(socket);

    if (!token) {
      return null;
    }

    try {
      const claims = verifyToken(token, {
        secret: this.config.jwt.accessSecret,
        issuer: this.config.jwt.issuer,
        audience: this.config.jwt.audience,
        expectedType: "access",
      });

      return { id: claims.sub, role: claims.role, tokenId: claims.jti };
    } catch (error) {
      log.warn("Socket authentication failed", {
        socketId: socket.id,
        reason: error instanceof JwtError ? error.code : "UNKNOWN",
      });
      return null;
    }
  }

  /**
   * Socket.IO-style middleware. Rejects the connection when the handshake
   * carries no valid token, and stores the principal on `socket.data.user`
   * for later event handlers.
   */
  middleware() {
    return (socket: SocketLike, next: (err?: Error) => void): void => {
      const user = this.authenticate(socket);

      if (!user) {
        next(new Error("UNAUTHORIZED"));
        return;
      }

      socket.data = { ...(socket.data ?? {}), user };
      next();
    };
  }

  /** Reads the principal attached during the handshake. */
  static currentUser(socket: SocketLike): AuthenticatedUser | null {
    const user = socket.data?.user;
    return user && typeof user === "object" ? (user as AuthenticatedUser) : null;
  }
}
