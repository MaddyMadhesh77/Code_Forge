/**
 * Structural types for a Socket.IO-compatible server.
 *
 * Declared locally rather than imported from `socket.io`, which is not a
 * dependency of this package. Defining only what the gateway actually uses
 * means it can be attached to a real Socket.IO server, or to a test double,
 * without either being a compile-time requirement.
 */

export type Emitter = {
  emit(event: string, payload?: unknown): void;
};

export type Socket = {
  id: string;
  handshake?: {
    auth?: Record<string, unknown>;
    query?: Record<string, unknown>;
    headers?: Record<string, unknown>;
  };
  data?: Record<string, unknown>;
  join(room: string): void;
  leave?(room: string): void;
  to(room: string): Emitter;
  emit(event: string, payload?: unknown): void;
  on(event: string, listener: (payload: unknown) => void): void;
  disconnect?(close?: boolean): void;
};

export type Server = {
  to(room: string): Emitter;
  emit(event: string, payload?: unknown): void;
  on(event: "connection", listener: (socket: Socket) => void): void;
};
