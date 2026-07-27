import { CollaborationService } from './collaboration.service.js';

export class CollaborationGateway {
  constructor(private readonly collaborationService = new CollaborationService()) {}

  publish(roomId: string, type: string, payload: unknown) {
    if (type === 'code-change' && typeof payload === 'string') {
      return this.collaborationService.publishCodeChange(roomId, payload);
    }

    return this.collaborationService.publishExecutionResult(roomId, payload);
  }
}

