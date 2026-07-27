/**
 * Interview System Client-Side Integration Guide
 * 
 * This file provides utilities and examples for integrating the interview system
 * into the frontend application.
 */

// ============================================================================
// WebSocket Client Utility
// ============================================================================

export class InterviewWebSocketClient {
  private socket: any;
  private sessionId = '';

  constructor(private socketUrl: string = 'ws://localhost:4000/interviews') {}

  connect(sessionId: string, userId: string, role: 'INTERVIEWER' | 'CANDIDATE' | 'OBSERVER') {
    this.sessionId = sessionId;

    // Connect to WebSocket
    // this.socket = io(this.socketUrl, { query: { sessionId, userId, role } });

    // Listen for connection events
    // this.socket.on('connect', () => {
    //   this.socket.emit('join-room', { sessionId, userId, role });
    // });
  }

  // Code collaboration
  onCodeChange(code: string, language: string) {
    this.socket?.emit('code-change', {
      sessionId: this.sessionId,
      code,
      language,
    });
  }

  // Verdict updates
  onVerdictUpdate(submissionId: string, verdict: string, testResults: any[]) {
    this.socket?.emit('verdict-update', {
      sessionId: this.sessionId,
      submissionId,
      verdict,
      testResults,
    });
  }

  // Cursor position tracking
  onCursorMove(userId: string, line: number, column: number) {
    this.socket?.emit('cursor-position', {
      sessionId: this.sessionId,
      userId,
      line,
      column,
    });
  }

  // Anti-cheat events
  onTabSwitch(participantId: string) {
    this.socket?.emit('tab-switch', {
      sessionId: this.sessionId,
      participantId,
    });
  }

  onCopyAttempt(participantId: string) {
    this.socket?.emit('copy-attempt', {
      sessionId: this.sessionId,
      participantId,
    });
  }

  onPasteAttempt(participantId: string) {
    this.socket?.emit('paste-attempt', {
      sessionId: this.sessionId,
      participantId,
    });
  }

  onWindowBlur(participantId: string) {
    this.socket?.emit('window-blur', {
      sessionId: this.sessionId,
      participantId,
    });
  }

  // Event listeners
  listenToCodeChanges(callback: (data: any) => void) {
    this.socket?.on('code-change', callback);
  }

  listenToVerdictUpdates(callback: (data: any) => void) {
    this.socket?.on('verdict-update', callback);
  }

  listenToCursorPositions(callback: (data: any) => void) {
    this.socket?.on('cursor-position', callback);
  }

  listenToAntiCheatAlerts(callback: (data: any) => void) {
    this.socket?.on('anti-cheat-alert', callback);
  }

  listenToParticipantJoined(callback: (data: any) => void) {
    this.socket?.on('participant-joined', callback);
  }

  listenToParticipantLeft(callback: (data: any) => void) {
    this.socket?.on('participant-left', callback);
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

// ============================================================================
// HTTP API Client Utility
// ============================================================================

export class InterviewAPIClient {
  constructor(private baseUrl: string = 'http://localhost:4000', private token: string) {}

  private async request(
    method: string,
    endpoint: string,
    body?: any,
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Interview CRUD
  async createInterview(
    title: string,
    problemIdOrOptions?: string | { problemId?: string; templateId?: string; role?: string; level?: string; scheduledAt?: string },
    scheduledAt?: string,
  ) {
    if (typeof problemIdOrOptions === 'string') {
      return this.request('POST', '/interviews', {
        title,
        problemId: problemIdOrOptions,
        scheduledAt,
      });
    }

    return this.request('POST', '/interviews', {
      title,
      ...(problemIdOrOptions ?? {}),
      scheduledAt: problemIdOrOptions?.scheduledAt ?? scheduledAt,
    });
  }

  async getInterview(sessionId: string) {
    return this.request('GET', `/interviews/${sessionId}`);
  }

  async listInterviews(limit = 10, offset = 0) {
    return this.request('GET', `/interviews?limit=${limit}&offset=${offset}`);
  }

  async updateInterviewStatus(sessionId: string, status: string) {
    return this.request('PUT', `/interviews/${sessionId}/status`, { status });
  }

  async endInterview(sessionId: string) {
    return this.request('POST', `/interviews/${sessionId}/end`);
  }

  // Session Links
  async createSessionLink(
    sessionId: string,
    role: 'INTERVIEWER' | 'CANDIDATE' | 'OBSERVER',
    expiresIn?: number,
  ) {
    return this.request('POST', `/interviews/${sessionId}/links`, {
      role,
      expiresIn,
    });
  }

  async getSessionLinks(sessionId: string) {
    return this.request('GET', `/interviews/${sessionId}/links`);
  }

  async revokeSessionLink(linkId: string) {
    return this.request('DELETE', `/interviews/links/${linkId}`);
  }

  async joinSession(token: string) {
    return this.request('POST', '/interviews/join', { token });
  }

  // Recording
  async getRecording(sessionId: string) {
    return this.request('GET', `/interviews/${sessionId}/recording`);
  }

  async uploadRecordingArtifact(
    sessionId: string,
    payload: {
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      durationMs?: number;
      source?: 'webcam' | 'screen';
      storageUrl?: string;
    },
  ) {
    return this.request('POST', `/interviews/${sessionId}/recordings/artifacts`, payload);
  }

  async getRecordingArtifacts(sessionId: string) {
    return this.request('GET', `/interviews/${sessionId}/recordings/artifacts`);
  }

  // Scorecard
  async createScorecard(
    sessionId: string,
    scores: {
      problemSolving: number;
      communication: number;
      debugging: number;
      codeQuality: number;
      timeManagement: number;
      testingApproach: number;
    },
    feedback?: string,
    overallRating?: number,
  ) {
    return this.request('POST', `/interviews/${sessionId}/scorecard`, {
      criteria: [
        'PROBLEM_SOLVING',
        'COMMUNICATION',
        'DEBUGGING',
        'CODE_QUALITY',
        'TIME_MANAGEMENT',
        'TESTING_APPROACH',
      ],
      ...scores,
      feedback,
      overallRating,
    });
  }

  async getScorecard(sessionId: string) {
    return this.request('GET', `/interviews/${sessionId}/scorecard`);
  }

  async getAllScorecards(sessionId: string) {
    return this.request('GET', `/interviews/${sessionId}/scorecards`);
  }

  async getScorecardReport(sessionId: string) {
    return this.request('GET', `/interviews/${sessionId}/scorecard-report`);
  }

  // Interview Templates & Rubrics
  async listInterviewTemplates(role?: 'FRONTEND' | 'BACKEND' | 'DATA' | 'SDE1' | 'SDE2') {
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    return this.request('GET', `/interviews/templates${query}`);
  }

  async createInterviewTemplate(payload: {
    title: string;
    role: 'FRONTEND' | 'BACKEND' | 'DATA' | 'SDE1' | 'SDE2';
    level?: string;
    problemIds?: string[];
    durationMinutes?: number;
    tags?: string[];
    rubricNotes?: string[];
    isPrivate?: boolean;
  }) {
    return this.request('POST', '/interviews/templates', payload);
  }

  async getInterviewTemplate(templateId: string) {
    return this.request('GET', `/interviews/templates/${templateId}`);
  }

  async applyInterviewTemplate(templateId: string, sessionId: string) {
    return this.request('POST', `/interviews/templates/${templateId}/apply`, { sessionId });
  }

  async draftRubric(payload: {
    title: string;
    role: 'FRONTEND' | 'BACKEND' | 'DATA' | 'SDE1' | 'SDE2';
    sessionTitle?: string;
    problemTitle?: string;
    interviewerNotes?: string[];
    candidateSignals?: string[];
  }) {
    return this.request('POST', '/interviews/rubric/draft', payload);
  }

  async getCalibrationDashboard(days = 30) {
    return this.request('GET', `/interviews/calibration/dashboard?days=${days}`);
  }

  // Collaborative Debugging
  async startDebugSession(sessionId: string, participants: string[]) {
    return this.request('POST', `/interviews/${sessionId}/debug/start`, { participants });
  }

  async executeDebugCode(sessionId: string, payload: {
    executedById: string;
    executedByName: string;
    code: string;
    language: string;
    annotations?: string[];
  }) {
    return this.request('POST', `/interviews/${sessionId}/debug/execute`, payload);
  }

  async annotateDebugSession(sessionId: string, payload: {
    authorId: string;
    authorName: string;
    message: string;
    anchor?: { filePath?: string; line?: number; column?: number } | null;
  }) {
    return this.request('POST', `/interviews/${sessionId}/debug/annotate`, payload);
  }

  async getDebugSession(sessionId: string) {
    return this.request('GET', `/interviews/${sessionId}/debug/session`);
  }

  async getEvidenceTrail(sessionId: string, candidateId: string) {
    return this.request('GET', `/interviews/${sessionId}/evidence-trail?candidateId=${encodeURIComponent(candidateId)}`);
  }

  async getSkillGraph(sessionId: string, candidateId: string, candidateName?: string) {
    const query = new URLSearchParams({ candidateId });
    if (candidateName) query.set('candidateName', candidateName);
    return this.request('GET', `/interviews/${sessionId}/skill-graph?${query.toString()}`);
  }

  async getBenchmarks(role: string, level: string, candidateId?: string) {
    const query = new URLSearchParams({ role, level });
    if (candidateId) query.set('candidateId', candidateId);
    return this.request('GET', `/interviews/benchmarks?${query.toString()}`);
  }

  async getQualityAnalytics(days = 30) {
    return this.request('GET', `/interviews/quality-analytics?days=${days}`);
  }

  // Anti-Cheat
  async getAntiCheatEvents(sessionId: string) {
    return this.request('GET', `/interviews/${sessionId}/anti-cheat/events`);
  }

  async getAntiCheatReport(sessionId: string) {
    return this.request('GET', `/interviews/${sessionId}/anti-cheat/report`);
  }

  // Export & Reporting
  async exportInterview(
    sessionId: string,
    format: 'PDF' | 'JSON',
    includeRecording = false,
  ) {
    return this.request('POST', `/interviews/${sessionId}/export`, {
      format,
      includeRecording,
    });
  }

  async createReport(sessionId: string) {
    return this.request('POST', `/interviews/${sessionId}/report`);
  }

  async getReport(sessionId: string) {
    return this.request('GET', `/interviews/${sessionId}/report`);
  }

  async extendShareLink(sessionId: string, expiryDays = 30) {
    return this.request('POST', `/interviews/${sessionId}/report/extend-share`, {
      expiryDays,
    });
  }

  async revokeShareLink(sessionId: string) {
    return this.request('POST', `/interviews/${sessionId}/report/revoke-share`);
  }

  // Integration API
  async listIntegrations(organizationId: string) {
    return this.request('GET', `/interviews/integrations?organizationId=${encodeURIComponent(organizationId)}`);
  }

  async connectIntegration(
    provider: 'GREENHOUSE' | 'LEVER' | 'WORKDAY',
    payload: { organizationId: string; externalId: string; notes?: string },
  ) {
    return this.request('POST', `/interviews/integrations/${provider}/connect`, payload);
  }

  async syncIntegration(
    provider: 'GREENHOUSE' | 'LEVER' | 'WORKDAY',
    payload: {
      organizationId: string;
      candidateId: string;
      externalCandidateId: string;
      status: 'APPLIED' | 'INTERVIEWING' | 'OFFER' | 'REJECTED' | 'HIRED';
    },
  ) {
    return this.request('POST', `/interviews/integrations/${provider}/sync`, payload);
  }

  // Billing
  async listBillingPlans() {
    return this.request('GET', '/interviews/billing/plans');
  }

  async getBillingSummary(organizationId: string) {
    return this.request('GET', `/interviews/billing/summary?organizationId=${encodeURIComponent(organizationId)}`);
  }

  async setBillingPlan(payload: { organizationId: string; planId: string; seatCount: number }) {
    return this.request('POST', '/interviews/billing/plan', payload);
  }

  async recordUsage(payload: { organizationId: string; units: number; reason: string }) {
    return this.request('POST', '/interviews/billing/usage', payload);
  }

  // Problem Library
  async listCustomProblems(teamId?: string, ownerId?: string) {
    const params = new URLSearchParams();
    if (teamId) params.set('teamId', teamId);
    if (ownerId) params.set('ownerId', ownerId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request('GET', `/problems/library${query}`);
  }

  async createCustomProblem(payload: {
    ownerId: string;
    teamId?: string;
    title: string;
    description: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    constraints?: string | null;
    starterCode?: Record<string, string>;
    supportedLangs?: Array<'python' | 'javascript' | 'cpp' | 'java'>;
    visibility?: 'PRIVATE' | 'TEAM' | 'PUBLIC';
  }) {
    return this.request('POST', '/problems/library', payload);
  }

  async addPrivateTestCase(
    problemId: string,
    payload: { input: string; expected: string; isHidden?: boolean },
  ) {
    return this.request('POST', `/problems/library/${problemId}/test-cases`, payload);
  }

  async listPrivateTestCases(problemId: string) {
    return this.request('GET', `/problems/library/${problemId}/test-cases`);
  }

  async shareProblemWithTeam(problemId: string, teamId: string) {
    return this.request('POST', `/problems/library/${problemId}/share`, { teamId });
  }

  async getPublicReport(token: string) {
    // This doesn't need authorization
    const response = await fetch(`${this.baseUrl}/interviews/public/report/${token}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
  }
}

// ============================================================================
// Anti-Cheat Detection Utility
// ============================================================================

export class AntiCheatDetector {
  private ws: InterviewWebSocketClient;
  private isMonitoring = false;

  constructor(ws: InterviewWebSocketClient, private participantId: string) {
    this.ws = ws;
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // Detect tab/window blur
    window.addEventListener('blur', () => {
      this.ws.onWindowBlur(this.participantId);
    });

    // Detect copy attempts
    document.addEventListener('copy', (e) => {
      const selectedText = window.getSelection()?.toString();
      if (selectedText && selectedText.length > 10) {
        this.ws.onCopyAttempt(this.participantId);
      }
    });

    // Detect paste attempts
    document.addEventListener('paste', (e) => {
      const pastedText = (e.clipboardData || (window as any).clipboardData)
        ?.getData('text');
      if (pastedText && pastedText.length > 10) {
        this.ws.onPasteAttempt(this.participantId);
      }
    });

    // Detect visibility changes (minimizing/switching apps)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.ws.onTabSwitch(this.participantId);
      }
    });
  }

  stopMonitoring() {
    this.isMonitoring = false;
  }
}

// ============================================================================
// Local Recording Utility (Client-side playback)
// ============================================================================

export class RecordingPlayer {
  private recording: any;
  private currentEventIndex = 0;
  private isPlaying = false;
  private playbackSpeed = 1;

  constructor(recording: any) {
    this.recording = recording;
  }

  play(onEventCallback: (event: any) => void) {
    this.isPlaying = true;
    this.playEvent(onEventCallback);
  }

  pause() {
    this.isPlaying = false;
  }

  setSpeed(speed: number) {
    this.playbackSpeed = speed;
  }

  private async playEvent(onEventCallback: (event: any) => void) {
    if (!this.isPlaying || this.currentEventIndex >= this.recording.events.length) {
      return;
    }

    const currentEvent = this.recording.events[this.currentEventIndex];
    const nextEvent = this.recording.events[this.currentEventIndex + 1];

    onEventCallback(currentEvent);

    if (nextEvent) {
      const delay = (nextEvent.timestamp - currentEvent.timestamp) / this.playbackSpeed;
      setTimeout(() => {
        this.currentEventIndex++;
        this.playEvent(onEventCallback);
      }, delay);
    }
  }

  getProgress(): number {
    return (this.currentEventIndex / this.recording.events.length) * 100;
  }

  seek(percentage: number) {
    this.currentEventIndex = Math.floor((percentage / 100) * this.recording.events.length);
  }
}

// ============================================================================
// React Hook Examples (if using React)
// ============================================================================

/**
 * Example React hooks for interview system integration:
 * 
 * import { useEffect, useState } from 'react';
 * 
 * export function useInterview(sessionId: string, token: string) {
 *   const [interview, setInterview] = useState(null);
 *   const [loading, setLoading] = useState(true);
 *   const [error, setError] = useState(null);
 * 
 *   const api = new InterviewAPIClient('http://localhost:4000', token);
 *   const ws = new InterviewWebSocketClient();
 * 
 *   useEffect(() => {
 *     api.getInterview(sessionId)
 *       .then(setInterview)
 *       .catch(setError)
 *       .finally(() => setLoading(false));
 * 
 *     ws.connect(sessionId, 'user-id', 'CANDIDATE');
 *   }, [sessionId]);
 * 
 *   return { interview, loading, error, api, ws };
 * }
 * 
 * export function useAntiCheat(participantId: string, ws: InterviewWebSocketClient) {
 *   useEffect(() => {
 *     const detector = new AntiCheatDetector(ws, participantId);
 *     detector.startMonitoring();
 * 
 *     return () => detector.stopMonitoring();
 *   }, [participantId, ws]);
 * }
 * 
 * export function useScorecard(sessionId: string, token: string) {
 *   const [scorecard, setScorecard] = useState(null);
 *   const api = new InterviewAPIClient('http://localhost:4000', token);
 * 
 *   const submitScorecard = async (scores: any) => {
 *     const result = await api.createScorecard(
 *       sessionId,
 *       scores.scores,
 *       scores.feedback,
 *       scores.overallRating
 *     );
 *     setScorecard(result);
 *     return result;
 *   };
 * 
 *   return { scorecard, submitScorecard };
 * }
 */
