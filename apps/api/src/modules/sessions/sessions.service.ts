import type { ParticipantRole, SessionStatus } from "@prisma/client";

import {
  SessionsRepository,
  type CreateSessionInput,
  type ListSessionsOptions,
  type SessionRecord,
} from "./sessions.repository.js";
import { ForbiddenError } from "../../common/errors/app-error.js";
import type { AuthenticatedUser } from "../../common/guards/jwt-auth.guard.js";
import type { Paginated } from "../users/users.repository.js";

export class SessionsService {
  constructor(private readonly repository: SessionsRepository) {}

  createSession(
    creatorId: string,
    input: Omit<CreateSessionInput, "creatorId">,
  ): Promise<SessionRecord> {
    return this.repository.create({ ...input, creatorId });
  }

  listSessions(options?: ListSessionsOptions): Promise<Paginated<SessionRecord>> {
    return this.repository.list(options);
  }

  /**
   * Session detail is restricted to members. Interview content — code,
   * participants, problem set — is not public; an ADMIN override exists for
   * support access.
   */
  async getSession(actor: AuthenticatedUser, sessionId: string): Promise<SessionRecord> {
    const session = await this.repository.requireById(sessionId);

    if (actor.role !== "ADMIN" && !(await this.repository.isMember(sessionId, actor.id))) {
      throw new ForbiddenError("You are not a participant in this session");
    }

    return session;
  }

  joinSession(sessionId: string, userId: string, role: ParticipantRole) {
    return this.repository.join(sessionId, userId, role);
  }

  attachProblem(sessionId: string, problemId: string) {
    return this.repository.attachProblem(sessionId, problemId);
  }

  /** Only the creator (or an ADMIN) may change a session's lifecycle state. */
  async updateStatus(
    actor: AuthenticatedUser,
    sessionId: string,
    status: SessionStatus,
  ): Promise<SessionRecord> {
    const session = await this.repository.requireById(sessionId);

    if (actor.role !== "ADMIN" && session.creatorId !== actor.id) {
      throw new ForbiddenError("Only the session creator can change its status");
    }

    return this.repository.updateStatus(sessionId, status);
  }

  async saveSnapshot(actor: AuthenticatedUser, sessionId: string, snapshot: string) {
    if (!(await this.repository.isMember(sessionId, actor.id))) {
      throw new ForbiddenError("You are not a participant in this session");
    }

    await this.repository.saveSnapshot(sessionId, snapshot);
  }

  loadSnapshot(sessionId: string) {
    return this.repository.loadSnapshot(sessionId);
  }

  isMember(sessionId: string, userId: string) {
    return this.repository.isMember(sessionId, userId);
  }
}
