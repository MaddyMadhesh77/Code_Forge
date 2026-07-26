import { logger } from '../../common/logging/logger.js';
import type { Server, Socket } from './gateway.types.js';

import { RecordingService } from './recording.service.js';
import { AntiCheatService } from './anti-cheat.service.js';
import { InterviewProductService } from './interview-product.service.js';
import { InterviewEvent, AntiCheatEventType } from '@codeforge/shared';
import { WsAuthGuard, type SocketLike } from '../../common/guards/ws-auth.guard.js';

export class InterviewsGateway {
  server!: Server;
  private readonly logger = logger.child('InterviewsGateway');
  private sessionConnections = new Map<string, Set<string>>();
  private socketToSessionUser = new Map<string, { sessionId: string; userId: string }>();
  private sessionUserSockets = new Map<string, Map<string, Set<string>>>();

  private readonly wsAuthGuard = new WsAuthGuard();

  constructor(
    private recordingService: RecordingService,
    private antiCheatService: AntiCheatService,
    private interviewProductService: InterviewProductService,
  ) {}

  /**
   * Authenticates the handshake before the socket may send anything.
   * Sockets bypass the HTTP middleware chain, so without this the realtime
   * channel is unauthenticated regardless of how well the REST API is guarded.
   */
  async handleConnection(client: Socket) {
    const user = this.wsAuthGuard.authenticate(client as unknown as SocketLike);

    if (!user) {
      this.logger.warn(`Rejecting unauthenticated socket ${client.id}`);
      (client as unknown as { disconnect?: (close?: boolean) => void }).disconnect?.(true);
      return;
    }

    (client as unknown as { data?: Record<string, unknown> }).data = {
      ...((client as unknown as { data?: Record<string, unknown> }).data ?? {}),
      user,
    };

    this.logger.info(`Client connected: ${client.id}`);
  }

  /**
   * The authenticated principal for a socket.
   *
   * Every handler resolves the actor through this rather than reading a
   * `userId` out of the message body — a client-supplied id let any socket
   * act as any user.
   */
  private actorId(client: Socket): string | null {
    const user = WsAuthGuard.currentUser(client as unknown as SocketLike);
    return user?.id ?? null;
  }

  async handleDisconnect(client: Socket) {
    this.logger.info(`Client disconnected: ${client.id}`);
    
    const membership = this.socketToSessionUser.get(client.id);
    if (!membership) {
      return;
    }

    const { sessionId, userId } = membership;
    const clients = this.sessionConnections.get(sessionId);
    clients?.delete(client.id);

    const sessionUsers = this.sessionUserSockets.get(sessionId);
    const userSockets = sessionUsers?.get(userId);
    if (userSockets) {
      userSockets.delete(client.id);
      if (userSockets.size === 0) {
        sessionUsers?.delete(userId);
      }
    }

    this.socketToSessionUser.delete(client.id);
    this.server.to(sessionId).emit('participant-left', { clientId: client.id, userId, timestamp: Date.now() });
  }
  async handleJoinRoom(
    client: Socket,
    data: { sessionId: string; role: string },
  ) {
    const userId = this.actorId(client);

    if (!userId) {
      return { success: false, reason: 'UNAUTHENTICATED' };
    }

    const { sessionId, role } = data;

    client.join(sessionId);
    
    if (!this.sessionConnections.has(sessionId)) {
      this.sessionConnections.set(sessionId, new Set());
    }
    this.sessionConnections.get(sessionId)!.add(client.id);

    if (!this.sessionUserSockets.has(sessionId)) {
      this.sessionUserSockets.set(sessionId, new Map());
    }

    const sessionUsers = this.sessionUserSockets.get(sessionId)!;
    if (!sessionUsers.has(userId)) {
      sessionUsers.set(userId, new Set());
    }
    sessionUsers.get(userId)!.add(client.id);
    this.socketToSessionUser.set(client.id, { sessionId, userId });

    this.server.to(sessionId).emit('participant-joined', {
      userId,
      role,
      timestamp: Date.now(),
    });

    return { success: true };
  }
  async handleChatMessage(
    client: Socket,
    data: { sessionId: string; displayName: string; message: string },
  ) {
    const userId = this.actorId(client);

    if (!userId) {
      return { success: false, reason: 'UNAUTHENTICATED' };
    }

    const payload = {
      userId,
      displayName: data.displayName,
      message: data.message,
      timestamp: Date.now(),
    };
    this.server.to(data.sessionId).emit('chat_message', payload);
    await this.recordingService.addEvent(data.sessionId, { type: 'chat-message', ...payload } as any);
    return { success: true };
  }
  async handleRunRequest(
    client: Socket,
    data: { sessionId: string; language: string; runId?: string },
  ) {
    const userId = this.actorId(client);

    if (!userId) {
      return { success: false, reason: 'UNAUTHENTICATED' };
    }

    client.to(data.sessionId).emit('run_request', {
      userId,
      language: data.language,
      runId: data.runId,
      timestamp: Date.now(),
    });
    return { success: true };
  }
  async handleRunResult(
    _client: Socket,
    data: { sessionId: string; runId: string; status: string; tests?: any[] },
  ) {
    this.server.to(data.sessionId).emit('run_result', {
      runId: data.runId,
      status: data.status,
      tests: data.tests ?? [],
      timestamp: Date.now(),
    });
    return { success: true };
  }
  async handleNotesUpdate(
    client: Socket,
    data: { sessionId: string; note: string },
  ) {
    const userId = this.actorId(client);

    if (!userId) {
      return { success: false, reason: 'UNAUTHENTICATED' };
    }

    client.to(data.sessionId).emit('notes_update', {
      userId,
      note: data.note,
      timestamp: Date.now(),
    });
    return { success: true };
  }
  async handleRatingSubmit(
    client: Socket,
    data: { sessionId: string; scores: Record<string, number> },
  ) {
    const userId = this.actorId(client);

    if (!userId) {
      return { success: false, reason: 'UNAUTHENTICATED' };
    }

    client.to(data.sessionId).emit('rating_submit', {
      userId,
      scores: data.scores,
      timestamp: Date.now(),
    });
    return { success: true };
  }
  async handleWebRtcOffer(
    client: Socket,
    data: { sessionId: string; targetUserId: string; offer: Record<string, unknown> },
  ) {
    // The sender identity comes from the verified handshake; accepting a
    // client-supplied `fromUserId` allowed peer impersonation.
    const fromUserId = this.actorId(client);

    if (!fromUserId) {
      return { success: false, reason: 'UNAUTHENTICATED' };
    }

    const targetSockets = this.sessionUserSockets.get(data.sessionId)?.get(data.targetUserId);
    if (!targetSockets || targetSockets.size === 0) {
      return { success: false, reason: 'TARGET_NOT_CONNECTED' };
    }

    targetSockets.forEach((socketId) => {
      this.server.to(socketId).emit('webrtc_offer', {
        sessionId: data.sessionId,
        fromUserId,
        offer: data.offer,
        timestamp: Date.now(),
      });
    });

    return { success: true };
  }
  async handleWebRtcAnswer(
    client: Socket,
    data: { sessionId: string; targetUserId: string; answer: Record<string, unknown> },
  ) {
    // The sender identity comes from the verified handshake; accepting a
    // client-supplied `fromUserId` allowed peer impersonation.
    const fromUserId = this.actorId(client);

    if (!fromUserId) {
      return { success: false, reason: 'UNAUTHENTICATED' };
    }

    const targetSockets = this.sessionUserSockets.get(data.sessionId)?.get(data.targetUserId);
    if (!targetSockets || targetSockets.size === 0) {
      return { success: false, reason: 'TARGET_NOT_CONNECTED' };
    }

    targetSockets.forEach((socketId) => {
      this.server.to(socketId).emit('webrtc_answer', {
        sessionId: data.sessionId,
        fromUserId,
        answer: data.answer,
        timestamp: Date.now(),
      });
    });

    return { success: true };
  }
  async handleWebRtcIceCandidate(
    client: Socket,
    data: { sessionId: string; targetUserId: string; candidate: Record<string, unknown> },
  ) {
    // The sender identity comes from the verified handshake; accepting a
    // client-supplied `fromUserId` allowed peer impersonation.
    const fromUserId = this.actorId(client);

    if (!fromUserId) {
      return { success: false, reason: 'UNAUTHENTICATED' };
    }

    const targetSockets = this.sessionUserSockets.get(data.sessionId)?.get(data.targetUserId);
    if (!targetSockets || targetSockets.size === 0) {
      return { success: false, reason: 'TARGET_NOT_CONNECTED' };
    }

    targetSockets.forEach((socketId) => {
      this.server.to(socketId).emit('webrtc_ice_candidate', {
        sessionId: data.sessionId,
        fromUserId,
        candidate: data.candidate,
        timestamp: Date.now(),
      });
    });

    return { success: true };
  }
  async handleCodeChange(
    client: Socket,
    data: { sessionId: string; code: string; language: string },
  ) {
    const { sessionId, code, language } = data;

    // Record the code change
    await this.recordingService.addCodeSnapshot(sessionId, {
      code,
      language,
      timestamp: Date.now(),
    });

    // Broadcast to other participants
    client.to(sessionId).emit('code-change', {
      code,
      language,
      timestamp: Date.now(),
    });

    // Record as event
    const event: InterviewEvent = {
      type: 'code-change',
      code,
      language,
      timestamp: Date.now(),
    };
    await this.recordingService.addEvent(sessionId, event);

    return { success: true };
  }
  async handleDebugStart(
    client: Socket,
    data: { sessionId: string; participants: string[] },
  ) {
    const session = this.interviewProductService.startDebugSession(data.sessionId, data.participants ?? []);
    client.to(data.sessionId).emit('debug-session-started', {
      sessionId: data.sessionId,
      participants: session.participants,
      startedAt: session.startedAt,
      timestamp: Date.now(),
    });
    return { success: true, session };
  }
  async handleDebugExecute(
    client: Socket,
    data: {
      sessionId: string;
      executedById: string;
      executedByName: string;
      code: string;
      language: string;
      annotations?: string[];
    },
  ) {
    const execution = this.interviewProductService.executeDebugCode(data);
    await this.recordingService.addEvent(data.sessionId, {
      type: 'debug-execution',
      ...execution,
      timestamp: Date.now(),
    } as any);
    client.to(data.sessionId).emit('debug-execution', execution);
    return { success: true, execution };
  }
  async handleDebugAnnotate(
    client: Socket,
    data: {
      sessionId: string;
      authorId: string;
      authorName: string;
      message: string;
      anchor?: { filePath?: string; line?: number; column?: number } | null;
    },
  ) {
    const annotation = this.interviewProductService.annotateDebugSession(data);
    await this.recordingService.addEvent(data.sessionId, {
      type: 'debug-annotation',
      ...annotation,
      timestamp: Date.now(),
    } as any);
    client.to(data.sessionId).emit('debug-annotation', annotation);
    return { success: true, annotation };
  }
  async handleVerdictUpdate(
    client: Socket,
    data: {
      sessionId: string;
      submissionId: string;
      verdict: string;
      testResults: any[];
    },
  ) {
    const { sessionId, submissionId, verdict, testResults } = data;

    // Broadcast verdict to all participants
    this.server.to(sessionId).emit('verdict-update', {
      submissionId,
      verdict,
      testResults,
      timestamp: Date.now(),
    });

    // Record as event
    const event: InterviewEvent = {
      type: 'verdict-update',
      submissionId,
      verdict,
      testResults,
      timestamp: Date.now(),
    };
    await this.recordingService.addEvent(sessionId, event);

    return { success: true };
  }
  async handleCursorPosition(
    client: Socket,
    data: {
      sessionId: string;
      userId: string;
      line: number;
      column: number;
    },
  ) {
    const { sessionId, userId, line, column } = data;

    // Broadcast cursor position to other participants
    client.to(sessionId).emit('cursor-position', {
      userId,
      line,
      column,
      timestamp: Date.now(),
    });

    // Optional: Record cursor positions
    const event: InterviewEvent = {
      type: 'cursor-position',
      userId,
      line,
      column,
      timestamp: Date.now(),
    };
    // Uncomment if you want to record all cursor movements
    // await this.recordingService.addEvent(sessionId, event);

    return { success: true };
  }
  async handleTabSwitch(
    client: Socket,
    data: { sessionId: string; participantId: string },
  ) {
    const { sessionId, participantId } = data;

    // Record anti-cheat event
    await this.antiCheatService.recordEvent(
      sessionId,
      participantId,
      'TAB_SWITCH' as AntiCheatEventType,
      { clientId: client.id },
    );

    // Broadcast to interviewer
    this.server.to(sessionId).emit('anti-cheat-alert', {
      type: 'TAB_SWITCH',
      participantId,
      timestamp: Date.now(),
      severity: 2,
    });

    return { success: true };
  }
  async handleCopyAttempt(
    client: Socket,
    data: { sessionId: string; participantId: string },
  ) {
    const { sessionId, participantId } = data;

    // Record anti-cheat event
    await this.antiCheatService.recordEvent(
      sessionId,
      participantId,
      'COPY_ATTEMPT' as AntiCheatEventType,
      { clientId: client.id },
    );

    // Broadcast to interviewer
    this.server.to(sessionId).emit('anti-cheat-alert', {
      type: 'COPY_ATTEMPT',
      participantId,
      timestamp: Date.now(),
      severity: 3,
    });

    return { success: true };
  }
  async handlePasteAttempt(
    client: Socket,
    data: { sessionId: string; participantId: string },
  ) {
    const { sessionId, participantId } = data;

    // Record anti-cheat event
    await this.antiCheatService.recordEvent(
      sessionId,
      participantId,
      'PASTE_ATTEMPT' as AntiCheatEventType,
      { clientId: client.id },
    );

    // Broadcast to interviewer
    this.server.to(sessionId).emit('anti-cheat-alert', {
      type: 'PASTE_ATTEMPT',
      participantId,
      timestamp: Date.now(),
      severity: 3,
    });

    return { success: true };
  }
  async handleWindowBlur(
    client: Socket,
    data: { sessionId: string; participantId: string },
  ) {
    const { sessionId, participantId } = data;

    // Record anti-cheat event (lower severity)
    await this.antiCheatService.recordEvent(
      sessionId,
      participantId,
      'WINDOW_BLUR' as AntiCheatEventType,
      { clientId: client.id },
    );

    // Optional: Broadcast to interviewer (can be noisy)
    this.server.to(sessionId).emit('anti-cheat-alert', {
      type: 'WINDOW_BLUR',
      participantId,
      timestamp: Date.now(),
      severity: 1,
    });

    return { success: true };
  }
  async handleTimelineUpdate(
    client: Socket,
    data: { sessionId: string; event: any },
  ) {
    const { sessionId, event } = data;

    // Broadcast timeline update to all participants
    this.server.to(sessionId).emit('timeline-update', {
      event,
      timestamp: Date.now(),
    });

    return { success: true };
  }

  // Broadcast message to entire session
  broadcastToSession(sessionId: string, event: string, data: any) {
    this.server.to(sessionId).emit(event, data);
  }

  // Send message to specific user in session
  sendToUser(sessionId: string, userId: string, event: string, data: any) {
    this.server.to(sessionId).emit(`${event}:${userId}`, data);
  }

  /**
   * Attaches this gateway to a Socket.IO-compatible server.
   *
   * The class previously carried NestJS decorators from a package that was
   * never installed — importing it threw at runtime, so the gateway could not
   * actually run. Registration is now explicit and framework-agnostic.
   */
  register(server: Server): void {
    this.server = server;

    server.on('connection', (socket: Socket) => {
      void this.handleConnection(socket);

      const handlers: Array<[string, (payload: unknown) => unknown]> = [
      ['join-room', (payload: unknown) => this.handleJoinRoom(socket, payload as never)],
      ['chat_message', (payload: unknown) => this.handleChatMessage(socket, payload as never)],
      ['run_request', (payload: unknown) => this.handleRunRequest(socket, payload as never)],
      ['run_result', (payload: unknown) => this.handleRunResult(socket, payload as never)],
      ['notes_update', (payload: unknown) => this.handleNotesUpdate(socket, payload as never)],
      ['rating_submit', (payload: unknown) => this.handleRatingSubmit(socket, payload as never)],
      ['webrtc_offer', (payload: unknown) => this.handleWebRtcOffer(socket, payload as never)],
      ['webrtc_answer', (payload: unknown) => this.handleWebRtcAnswer(socket, payload as never)],
      ['webrtc_ice_candidate', (payload: unknown) => this.handleWebRtcIceCandidate(socket, payload as never)],
      ['code-change', (payload: unknown) => this.handleCodeChange(socket, payload as never)],
      ['debug-start', (payload: unknown) => this.handleDebugStart(socket, payload as never)],
      ['debug-execute', (payload: unknown) => this.handleDebugExecute(socket, payload as never)],
      ['debug-annotate', (payload: unknown) => this.handleDebugAnnotate(socket, payload as never)],
      ['verdict-update', (payload: unknown) => this.handleVerdictUpdate(socket, payload as never)],
      ['cursor-position', (payload: unknown) => this.handleCursorPosition(socket, payload as never)],
      ['tab-switch', (payload: unknown) => this.handleTabSwitch(socket, payload as never)],
      ['copy-attempt', (payload: unknown) => this.handleCopyAttempt(socket, payload as never)],
      ['paste-attempt', (payload: unknown) => this.handlePasteAttempt(socket, payload as never)],
      ['window-blur', (payload: unknown) => this.handleWindowBlur(socket, payload as never)],
      ['timeline-update', (payload: unknown) => this.handleTimelineUpdate(socket, payload as never)],
      ];

      for (const [event, handler] of handlers) {
        socket.on(event, (payload: unknown) => {
          try {
            const outcome = handler(payload);

            // Handlers are async; a rejection must be logged, not left as an
            // unhandled rejection that takes down the process.
            if (outcome instanceof Promise) {
              outcome.catch((err) => this.logger.error('Socket handler failed', { event, err }));
            }
          } catch (err) {
            this.logger.error('Socket handler threw', { event, err });
          }
        });
      }

      socket.on('disconnect', () => {
        void this.handleDisconnect(socket);
      });
    });

    this.logger.info('Interview gateway registered', { events: 20 });
  }
}
