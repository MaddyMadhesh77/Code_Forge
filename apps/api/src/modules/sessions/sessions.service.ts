import type { CreateSessionDto } from './dto/create-session.dto.js';
import { SessionsStore } from './sessions.store.js';

export class SessionsService {
  constructor(private readonly store = new SessionsStore()) {}

  createSession(creatorId: string, input: CreateSessionDto) {
    return this.store.create(creatorId, {
      title: input.title,
      scheduledAt: input.scheduledAt,
    });
  }

  listSessions() {
    return this.store.list();
  }

  getSession(sessionId: string) {
    return this.store.getById(sessionId) ?? null;
  }

  joinSession(sessionId: string, userId: string, role: 'INTERVIEWER' | 'CANDIDATE' | 'OBSERVER') {
    return this.store.join(sessionId, userId, role);
  }

  attachProblem(sessionId: string, problemId: string) {
    return this.store.attachProblem(sessionId, problemId);
  }

  updateSnapshot(sessionId: string, snapshot: string) {
    return this.store.updateSnapshot(sessionId, snapshot);
  }
}

