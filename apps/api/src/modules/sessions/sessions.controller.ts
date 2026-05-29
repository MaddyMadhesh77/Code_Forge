import type { CreateSessionDto } from './dto/create-session.dto.js';
import { SessionsService } from './sessions.service.js';

export class SessionsController {
  constructor(private readonly sessionsService = new SessionsService()) {}

  create(userId: string, body: CreateSessionDto) {
    return this.sessionsService.createSession(userId, body);
  }

  list() {
    return this.sessionsService.listSessions();
  }

  get(sessionId: string) {
    return this.sessionsService.getSession(sessionId);
  }

  join(sessionId: string, userId: string, role: 'INTERVIEWER' | 'CANDIDATE' | 'OBSERVER') {
    return this.sessionsService.joinSession(sessionId, userId, role);
  }
}

