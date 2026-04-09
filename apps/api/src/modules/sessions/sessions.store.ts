import type {
  CreateSessionInput,
  InterviewSession,
  SessionParticipant,
} from "../../../../../packages/shared/src/schemas/session.schema.js";

type SessionParticipantRole = SessionParticipant["role"];

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const sessions: InterviewSession[] = [];

export class SessionsStore {
  create(creatorId: string, input: CreateSessionInput): InterviewSession {
    const session: InterviewSession = {
      id: makeId("session"),
      title: input.title,
      creatorId,
      status: "SCHEDULED",
      scheduledAt: input.scheduledAt ?? null,
      startedAt: null,
      endedAt: null,
      yjsSnapshot: null,
      participants: [],
      problemIds: [],
    };

    sessions.push(session);
    return session;
  }

  list(): InterviewSession[] {
    return [...sessions];
  }

  getById(sessionId: string): InterviewSession | undefined {
    return sessions.find((session) => session.id === sessionId);
  }

  join(sessionId: string, userId: string, role: SessionParticipantRole): SessionParticipant {
    const session = this.getById(sessionId);

    if (!session) {
      throw new Error("SESSION_NOT_FOUND");
    }

    const existing = session.participants.find((participant) => participant.userId === userId);

    if (existing) {
      return existing;
    }

    const participant: SessionParticipant = {
      id: makeId("participant"),
      sessionId,
      userId,
      role,
      joinedAt: new Date().toISOString(),
    };

    session.participants.push(participant);
    return participant;
  }

  attachProblem(sessionId: string, problemId: string): InterviewSession {
    const session = this.getById(sessionId);

    if (!session) {
      throw new Error("SESSION_NOT_FOUND");
    }

    if (!session.problemIds.includes(problemId)) {
      session.problemIds.push(problemId);
    }

    return session;
  }

  updateSnapshot(sessionId: string, snapshot: string): InterviewSession {
    const session = this.getById(sessionId);

    if (!session) {
      throw new Error("SESSION_NOT_FOUND");
    }

    session.yjsSnapshot = snapshot;
    return session;
  }
}
