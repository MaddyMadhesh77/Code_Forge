import { PresenceStore } from './presence.store.js';

export class PresenceService {
  constructor(private readonly presenceStore = new PresenceStore()) {}

  update(sessionId: string, userId: string, cursor: number, selection: string | null) {
    return this.presenceStore.update(sessionId, userId, cursor, selection);
  }

  remove(sessionId: string, userId: string) {
    return this.presenceStore.remove(sessionId, userId);
  }

  list(sessionId: string) {
    return this.presenceStore.list(sessionId);
  }
}

