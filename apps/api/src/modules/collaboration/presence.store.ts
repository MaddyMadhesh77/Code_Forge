type PresenceState = {
  cursor: number;
  selection: string | null;
  timestamp: string;
};

const presenceBySession = new Map<string, Map<string, PresenceState>>();

export class PresenceStore {
  update(sessionId: string, userId: string, cursor: number, selection: string | null) {
    const sessionPresence = presenceBySession.get(sessionId) ?? new Map<string, PresenceState>();
    sessionPresence.set(userId, {
      cursor,
      selection,
      timestamp: new Date().toISOString(),
    });
    presenceBySession.set(sessionId, sessionPresence);
    return sessionPresence.get(userId)!;
  }

  remove(sessionId: string, userId: string) {
    const sessionPresence = presenceBySession.get(sessionId);
    if (!sessionPresence) {
      return false;
    }

    return sessionPresence.delete(userId);
  }

  list(sessionId: string) {
    return Array.from(presenceBySession.get(sessionId)?.entries() ?? []);
  }
}
