import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { RecordingService } from './recording.service.js';
import { AntiCheatService } from './anti-cheat.service.js';
import { InterviewProductService } from './interview-product.service.js';
import { InterviewEvent, AntiCheatEventType } from '@codeforge/shared';

@WebSocketGateway({
  namespace: '/interviews',
  cors: { origin: '*' },
})

export class InterviewsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('InterviewsGateway');
  private sessionConnections = new Map<string, Set<string>>();
  private socketToSessionUser = new Map<string, { sessionId: string; userId: string }>();
  private sessionUserSockets = new Map<string, Map<string, Set<string>>>();

  constructor(
    private recordingService: RecordingService,
    private antiCheatService: AntiCheatService,
    private interviewProductService: InterviewProductService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
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

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; userId: string; role: string },
  ) {
    const { sessionId, userId, role } = data;
    
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
      displayName: data.userId,
      role,
      timestamp: Date.now(),
    });

    return { success: true };
  }

  @SubscribeMessage('chat_message')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; userId: string; displayName: string; message: string },
  ) {
    const payload = {
      userId: data.userId,
      displayName: data.displayName,
      message: data.message,
      timestamp: Date.now(),
    };
    this.server.to(data.sessionId).emit('chat_message', payload);
    await this.recordingService.addEvent(data.sessionId, { type: 'chat-message', ...payload } as any);
    return { success: true };
  }

  @SubscribeMessage('run_request')
  async handleRunRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; userId: string; language: string; runId?: string },
  ) {
    client.to(data.sessionId).emit('run_request', {
      userId: data.userId,
      language: data.language,
      runId: data.runId,
      timestamp: Date.now(),
    });
    return { success: true };
  }

  @SubscribeMessage('run_result')
  async handleRunResult(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { sessionId: string; runId: string; status: string; tests?: any[] },
  ) {
    this.server.to(data.sessionId).emit('run_result', {
      runId: data.runId,
      status: data.status,
      tests: data.tests ?? [],
      timestamp: Date.now(),
    });
    return { success: true };
  }

  @SubscribeMessage('notes_update')
  async handleNotesUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; userId: string; note: string },
  ) {
    client.to(data.sessionId).emit('notes_update', {
      userId: data.userId,
      note: data.note,
      timestamp: Date.now(),
    });
    return { success: true };
  }

  @SubscribeMessage('rating_submit')
  async handleRatingSubmit(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; userId: string; scores: Record<string, number> },
  ) {
    client.to(data.sessionId).emit('rating_submit', {
      userId: data.userId,
      scores: data.scores,
      timestamp: Date.now(),
    });
    return { success: true };
  }

  @SubscribeMessage('webrtc_offer')
  async handleWebRtcOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; targetUserId: string; fromUserId: string; offer: Record<string, unknown> },
  ) {
    const targetSockets = this.sessionUserSockets.get(data.sessionId)?.get(data.targetUserId);
    if (!targetSockets || targetSockets.size === 0) {
      return { success: false, reason: 'TARGET_NOT_CONNECTED' };
    }

    targetSockets.forEach((socketId) => {
      this.server.to(socketId).emit('webrtc_offer', {
        sessionId: data.sessionId,
        fromUserId: data.fromUserId,
        offer: data.offer,
        timestamp: Date.now(),
      });
    });

    return { success: true };
  }

  @SubscribeMessage('webrtc_answer')
  async handleWebRtcAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; targetUserId: string; fromUserId: string; answer: Record<string, unknown> },
  ) {
    const targetSockets = this.sessionUserSockets.get(data.sessionId)?.get(data.targetUserId);
    if (!targetSockets || targetSockets.size === 0) {
      return { success: false, reason: 'TARGET_NOT_CONNECTED' };
    }

    targetSockets.forEach((socketId) => {
      this.server.to(socketId).emit('webrtc_answer', {
        sessionId: data.sessionId,
        fromUserId: data.fromUserId,
        answer: data.answer,
        timestamp: Date.now(),
      });
    });

    return { success: true };
  }

  @SubscribeMessage('webrtc_ice_candidate')
  async handleWebRtcIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; targetUserId: string; fromUserId: string; candidate: Record<string, unknown> },
  ) {
    const targetSockets = this.sessionUserSockets.get(data.sessionId)?.get(data.targetUserId);
    if (!targetSockets || targetSockets.size === 0) {
      return { success: false, reason: 'TARGET_NOT_CONNECTED' };
    }

    targetSockets.forEach((socketId) => {
      this.server.to(socketId).emit('webrtc_ice_candidate', {
        sessionId: data.sessionId,
        fromUserId: data.fromUserId,
        candidate: data.candidate,
        timestamp: Date.now(),
      });
    });

    return { success: true };
  }

  @SubscribeMessage('code-change')
  async handleCodeChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; code: string; language: string },
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

  @SubscribeMessage('debug-start')
  async handleDebugStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; participants: string[] },
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

  @SubscribeMessage('debug-execute')
  async handleDebugExecute(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
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

  @SubscribeMessage('debug-annotate')
  async handleDebugAnnotate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
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

  @SubscribeMessage('verdict-update')
  async handleVerdictUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
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

  @SubscribeMessage('cursor-position')
  async handleCursorPosition(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
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

  @SubscribeMessage('tab-switch')
  async handleTabSwitch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; participantId: string },
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

  @SubscribeMessage('copy-attempt')
  async handleCopyAttempt(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; participantId: string },
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

  @SubscribeMessage('paste-attempt')
  async handlePasteAttempt(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; participantId: string },
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

  @SubscribeMessage('window-blur')
  async handleWindowBlur(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; participantId: string },
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

  @SubscribeMessage('timeline-update')
  async handleTimelineUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; event: any },
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
}

