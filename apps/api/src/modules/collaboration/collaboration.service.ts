import { CollaborationEventStore } from './collaboration.event.store.js';

export class CollaborationService {
  constructor(private readonly eventStore = new CollaborationEventStore()) {}

  publishCodeChange(roomId: string, code: string) {
    return this.eventStore.append(roomId, 'code-change', { code });
  }

  publishExecutionResult(roomId: string, result: unknown) {
    return this.eventStore.append(roomId, 'execution-result', result);
  }

  listExecutionEvents(roomId: string) {
    return this.eventStore
      .list(roomId)
      .filter((event) => event.type === 'execution-result');
  }
}

