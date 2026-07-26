import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getStoredAuthTokens } from '../services/authStorage';

/* ── Types ── */
export interface Participant {
  userId: string;
  displayName: string;
  role: 'INTERVIEWER' | 'CANDIDATE' | 'OBSERVER';
}

export interface CursorPosition {
  userId: string;
  line: number;
  column: number;
}

export interface AntiCheatAlert {
  participantId: string;
  eventType: string;
  severity?: number;
  timestamp: number;
}

export interface ChatMessageEvent {
  userId: string;
  displayName: string;
  message: string;
  timestamp: number;
}

export interface RunRequestEvent {
  userId: string;
  language: string;
  runId?: string;
  timestamp: number;
}

export interface RunResultEvent {
  runId: string;
  status: string;
  tests: unknown[];
  timestamp: number;
}

export interface NotesUpdateEvent {
  userId: string;
  note: string;
  timestamp: number;
}

export interface RatingSubmitEvent {
  userId: string;
  scores: Record<string, number>;
  timestamp: number;
}

export interface WebRtcOfferEvent {
  fromUserId: string;
  offer: RTCSessionDescriptionInit;
  timestamp: number;
}

export interface WebRtcAnswerEvent {
  fromUserId: string;
  answer: RTCSessionDescriptionInit;
  timestamp: number;
}

export interface WebRtcIceCandidateEvent {
  fromUserId: string;
  candidate: RTCIceCandidateInit;
  timestamp: number;
}

interface UseInterviewOptions {
  sessionId: string;
  userId: string;
  userName: string;
  role: 'INTERVIEWER' | 'CANDIDATE' | 'OBSERVER';
  enabled?: boolean;
}

export function useInterview({ sessionId, userId, userName, role, enabled = true }: UseInterviewOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteCode, setRemoteCode] = useState<string>('');
  const [remoteLang, setRemoteLang] = useState<string>('python');
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [antiCheatAlerts, setAntiCheatAlerts] = useState<AntiCheatAlert[]>([]);
  const [verdictUpdates, setVerdictUpdates] = useState<Array<{ submissionId: string; verdict: string }>>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessageEvent[]>([]);
  const [runRequests, setRunRequests] = useState<RunRequestEvent[]>([]);
  const [runResults, setRunResults] = useState<RunResultEvent[]>([]);
  const [notesUpdates, setNotesUpdates] = useState<NotesUpdateEvent[]>([]);
  const [ratingSubmissions, setRatingSubmissions] = useState<RatingSubmitEvent[]>([]);
  const [rtcOffers, setRtcOffers] = useState<WebRtcOfferEvent[]>([]);
  const [rtcAnswers, setRtcAnswers] = useState<WebRtcAnswerEvent[]>([]);
  const [rtcIceCandidates, setRtcIceCandidates] = useState<WebRtcIceCandidateEvent[]>([]);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const socket = io('/interviews', {
      auth: { token: getStoredAuthTokens()?.accessToken },
      query: { sessionId, userId, role },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-room', { sessionId, userId, role, displayName: userName });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('participant-joined', (data: Participant) => {
      setParticipants((prev) => {
        const participant: Participant = {
          userId: data.userId,
          displayName: data.displayName ?? data.userId,
          role: data.role,
        };
        if (prev.find((p) => p.userId === participant.userId)) return prev;
        return [...prev, participant];
      });
    });

    socket.on('participant-left', (data: { userId: string }) => {
      setParticipants((prev) => prev.filter((p) => p.userId !== data.userId));
    });

    socket.on('code-change', (data: { code: string; language: string }) => {
      setRemoteCode(data.code);
      setRemoteLang(data.language);
    });

    socket.on('cursor-position', (data: CursorPosition) => {
      setCursors((prev) => {
        const filtered = prev.filter((c) => c.userId !== data.userId);
        return [...filtered, data];
      });
    });

    socket.on('verdict-update', (data: { submissionId: string; verdict: string }) => {
      setVerdictUpdates((prev) => [...prev, data]);
    });

    socket.on('anti-cheat-alert', (data: AntiCheatAlert) => {
      setAntiCheatAlerts((prev) => [...prev, data]);
    });

    socket.on('chat_message', (data: ChatMessageEvent) => {
      setChatMessages((prev) => [...prev, data]);
    });

    socket.on('run_request', (data: RunRequestEvent) => {
      setRunRequests((prev) => [...prev, data]);
    });

    socket.on('run_result', (data: RunResultEvent) => {
      setRunResults((prev) => [...prev, data]);
    });

    socket.on('notes_update', (data: NotesUpdateEvent) => {
      setNotesUpdates((prev) => [...prev, data]);
    });

    socket.on('rating_submit', (data: RatingSubmitEvent) => {
      setRatingSubmissions((prev) => [...prev, data]);
    });

    socket.on('webrtc_offer', (data: WebRtcOfferEvent) => {
      setRtcOffers((prev) => [...prev, data]);
    });

    socket.on('webrtc_answer', (data: WebRtcAnswerEvent) => {
      setRtcAnswers((prev) => [...prev, data]);
    });

    socket.on('webrtc_ice_candidate', (data: WebRtcIceCandidateEvent) => {
      setRtcIceCandidates((prev) => [...prev, data]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, sessionId, userId, role, userName]);

  const emitCodeChange = useCallback(
    (code: string, language: string) => {
      socketRef.current?.emit('code-change', { sessionId, code, language });
    },
    [sessionId],
  );

  const emitCursorPosition = useCallback(
    (line: number, column: number) => {
      socketRef.current?.emit('cursor-position', { sessionId, userId, line, column });
    },
    [sessionId, userId],
  );

  const emitVerdictUpdate = useCallback(
    (submissionId: string, verdict: string, testResults: unknown[] = []) => {
      socketRef.current?.emit('verdict-update', { sessionId, submissionId, verdict, testResults });
    },
    [sessionId],
  );

  // Anti-cheat emissions
  const emitTabSwitch = useCallback(() => {
    socketRef.current?.emit('tab-switch', { sessionId, participantId: userId });
  }, [sessionId, userId]);

  const emitWindowBlur = useCallback(() => {
    socketRef.current?.emit('window-blur', { sessionId, participantId: userId });
  }, [sessionId, userId]);

  const emitCopyAttempt = useCallback(() => {
    socketRef.current?.emit('copy-attempt', { sessionId, participantId: userId });
  }, [sessionId, userId]);

  const emitPasteAttempt = useCallback(() => {
    socketRef.current?.emit('paste-attempt', { sessionId, participantId: userId });
  }, [sessionId, userId]);

  const emitChatMessage = useCallback((message: string) => {
    socketRef.current?.emit('chat_message', {
      sessionId,
      userId,
      displayName: userName,
      message,
    });
  }, [sessionId, userId, userName]);

  const emitRunRequest = useCallback((language: string, runId?: string) => {
    socketRef.current?.emit('run_request', {
      sessionId,
      userId,
      language,
      runId,
    });
  }, [sessionId, userId]);

  const emitRunResult = useCallback((runId: string, status: string, tests: unknown[] = []) => {
    socketRef.current?.emit('run_result', {
      sessionId,
      runId,
      status,
      tests,
    });
  }, [sessionId]);

  const emitNotesUpdate = useCallback((note: string) => {
    socketRef.current?.emit('notes_update', {
      sessionId,
      userId,
      note,
    });
  }, [sessionId, userId]);

  const emitRatingSubmit = useCallback((scores: Record<string, number>) => {
    socketRef.current?.emit('rating_submit', {
      sessionId,
      userId,
      scores,
    });
  }, [sessionId, userId]);

  const emitWebRtcOffer = useCallback((targetUserId: string, offer: RTCSessionDescriptionInit) => {
    socketRef.current?.emit('webrtc_offer', {
      sessionId,
      targetUserId,
      fromUserId: userId,
      offer,
    });
  }, [sessionId, userId]);

  const emitWebRtcAnswer = useCallback((targetUserId: string, answer: RTCSessionDescriptionInit) => {
    socketRef.current?.emit('webrtc_answer', {
      sessionId,
      targetUserId,
      fromUserId: userId,
      answer,
    });
  }, [sessionId, userId]);

  const emitWebRtcIceCandidate = useCallback((targetUserId: string, candidate: RTCIceCandidateInit) => {
    socketRef.current?.emit('webrtc_ice_candidate', {
      sessionId,
      targetUserId,
      fromUserId: userId,
      candidate,
    });
  }, [sessionId, userId]);

  return {
    isConnected,
    participants,
    remoteCode,
    remoteLang,
    cursors,
    antiCheatAlerts,
    verdictUpdates,
    chatMessages,
    runRequests,
    runResults,
    notesUpdates,
    ratingSubmissions,
    rtcOffers,
    rtcAnswers,
    rtcIceCandidates,
    emitCodeChange,
    emitCursorPosition,
    emitVerdictUpdate,
    emitTabSwitch,
    emitWindowBlur,
    emitCopyAttempt,
    emitPasteAttempt,
    emitChatMessage,
    emitRunRequest,
    emitRunResult,
    emitNotesUpdate,
    emitRatingSubmit,
    emitWebRtcOffer,
    emitWebRtcAnswer,
    emitWebRtcIceCandidate,
  };
}
