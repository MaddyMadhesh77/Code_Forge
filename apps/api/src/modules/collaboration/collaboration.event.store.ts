type CollaborationEvent = {
  type: string;
  payload: unknown;
  at: string;
};

const eventsByRoom = new Map<string, CollaborationEvent[]>();

export class CollaborationEventStore {
  append(roomId: string, type: string, payload: unknown) {
    const roomEvents = eventsByRoom.get(roomId) ?? [];
    const event: CollaborationEvent = {
      type,
      payload,
      at: new Date().toISOString(),
    };
    roomEvents.push(event);
    eventsByRoom.set(roomId, roomEvents);
    return event;
  }

  list(roomId: string) {
    return [...(eventsByRoom.get(roomId) ?? [])];
  }

  publishExecutionResult(roomId: string, payload: unknown) {
    return this.append(roomId, 'execution-result', payload);
  }

  listExecutionEvents(roomId: string) {
    return this.list(roomId).filter((event) => event.type === 'execution-result');
  }
}

