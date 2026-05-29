/**
 * Complete TypeScript Types & Interfaces for Interview System
 * Import these types in your components for full type safety
 */

// ============================================================================
// Session & Participants
// ============================================================================

export interface InterviewSession {
  id: string;
  title: string;
  creatorId: string;
  templateId?: string | null;
  role?: string | null;
  level?: string | null;
  status: SessionStatus;
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  yjsSnapshot?: string;
  createdAt: Date;
  updatedAt: Date;
  participants: SessionParticipant[];
  problems: InterviewSessionProblem[];
  submissions: Submission[];
  recording?: InterviewRecording;
  scorecards: InterviewScorecard[];
  report?: InterviewReport;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
  user: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface InterviewSessionProblem {
  id: string;
  sessionId: string;
  problemId: string;
  ordinal: number;
  problem: Problem;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  constraints?: string;
  starterCode: Record<string, string>;
  supportedLangs: string[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Enums
// ============================================================================

export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ParticipantRole {
  INTERVIEWER = 'INTERVIEWER',
  CANDIDATE = 'CANDIDATE',
  OBSERVER = 'OBSERVER',
  ADMIN = 'ADMIN',
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum Verdict {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  WRONG_ANSWER = 'WRONG_ANSWER',
  TIME_LIMIT_EXCEEDED = 'TIME_LIMIT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  COMPILATION_ERROR = 'COMPILATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export enum ScorecardCriteria {
  PROBLEM_SOLVING = 'PROBLEM_SOLVING',
  COMMUNICATION = 'COMMUNICATION',
  DEBUGGING = 'DEBUGGING',
  CODE_QUALITY = 'CODE_QUALITY',
  TIME_MANAGEMENT = 'TIME_MANAGEMENT',
  TESTING_APPROACH = 'TESTING_APPROACH',
}

export enum AntiCheatEventType {
  TAB_SWITCH = 'TAB_SWITCH',
  COPY_ATTEMPT = 'COPY_ATTEMPT',
  PASTE_ATTEMPT = 'PASTE_ATTEMPT',
  WINDOW_BLUR = 'WINDOW_BLUR',
  EXTERNAL_TOOL_DETECTED = 'EXTERNAL_TOOL_DETECTED',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

// ============================================================================
// Session Links & Access
// ============================================================================

export interface SessionLink {
  id: string;
  sessionId: string;
  role: ParticipantRole;
  token: string;
  isRevoked: boolean;
  expiresAt?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface DebugAnnotation {
  id: string;
  sessionId: string;
  authorId: string;
  authorName: string;
  message: string;
  anchor: {
    filePath?: string;
    line?: number;
    column?: number;
  } | null;
  createdAt: Date;
}

export interface DebugExecution {
  id: string;
  sessionId: string;
  executedById: string;
  executedByName: string;
  code: string;
  language: string;
  result: {
    verdict: string;
    stdout: string;
    stderr: string;
  };
  annotations: string[];
  createdAt: Date;
}

export interface DebugSession {
  sessionId: string;
  status: 'ACTIVE' | 'ENDED';
  participants: string[];
  executions: DebugExecution[];
  annotations: DebugAnnotation[];
  startedAt: Date;
  updatedAt: Date;
}

export interface CreateSessionLinkRequest {
  role: ParticipantRole;
  expiresIn?: number;
}

export interface JoinSessionRequest {
  token: string;
}

// ============================================================================
// Recording & Events
// ============================================================================

export interface InterviewRecording {
  id: string;
  sessionId: string;
  events: RecordingEvent[];
  codeSnapshots: CodeSnapshot[];
  startedAt: Date;
  stoppedAt?: Date;
  duration: number;
  createdAt: Date;
}

export interface RecordingEvent {
  event: InterviewEvent;
  timestamp: number;
}

export interface CodeSnapshot {
  code: string;
  language: string;
  timestamp: number;
  submissionId?: string;
}

// ============================================================================
// WebSocket Events
// ============================================================================

export type InterviewEvent =
  | CodeChangeEvent
  | VerdictUpdateEvent
  | CursorPositionEvent
  | ParticipantEvent;

export interface CodeChangeEvent {
  type: 'code-change';
  code: string;
  language: string;
  timestamp: number;
}

export interface VerdictUpdateEvent {
  type: 'verdict-update';
  submissionId: string;
  verdict: string;
  testResults: TestResult[];
  timestamp: number;
}

export interface CursorPositionEvent {
  type: 'cursor-position';
  userId: string;
  line: number;
  column: number;
  timestamp: number;
}

export interface ParticipantEvent {
  type: 'participant-joined' | 'participant-left';
  userId: string;
  role?: ParticipantRole;
  timestamp: number;
}

export interface AntiCheatSignal {
  type: 'tab-switch' | 'copy-paste-attempt' | 'paste-attempt' | 'window-blur';
  timestamp: number;
}

// ============================================================================
// Scorecard & Evaluation
// ============================================================================

export interface InterviewScorecard {
  id: string;
  sessionId: string;
  interviewerId: string;
  candidateId: string;
  scores: ScorecardScores;
  feedback?: string;
  overallRating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CandidateSkillNode {
  round: number;
  sessionId: string;
  role: string;
  level: string;
  score: number;
  difficulty: number;
  createdAt: Date;
}

export interface CandidateSkillGraph {
  candidateId: string;
  candidateName?: string;
  criteriaAverages: Record<string, number>;
  overallTrajectory: CandidateSkillNode[];
  improvementTrend: number;
}

export interface EvidenceTrailItem {
  id: string;
  category: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  label: string;
  evidence: string;
  source: string;
  weight: number;
}

export interface EvidenceTrail {
  sessionId: string;
  candidateId: string;
  recommendation: 'HIRE' | 'NO_HIRE' | 'REVIEW';
  summary: string;
  items: EvidenceTrailItem[];
  generatedAt: Date;
}

export interface BenchmarkSummary {
  role: string;
  level: string;
  sampleSize: number;
  averageScore: number;
  candidatePercentile?: number;
  difficultyAverage: number;
  notes: string[];
}

export interface InterviewerBiasSignal {
  interviewerId: string;
  interviewerName: string;
  biasType: 'LENIENT' | 'STRICT' | 'HIGH_VARIANCE';
  signalScore: number;
  evidence: string;
}

export interface QualityAnalytics {
  rangeDays: number;
  questionDifficultyDrift: number;
  falseNegativeSignals: string[];
  interviewerBiasSignals: InterviewerBiasSignal[];
  notes: string[];
}

export interface ScorecardScores {
  problemSolving: number;
  communication: number;
  debugging: number;
  codeQuality: number;
  timeManagement: number;
  testingApproach: number;
}

export interface CreateScorecardRequest {
  criteria: ScorecardCriteria[];
  problemSolving: number;
  communication: number;
  debugging: number;
  codeQuality: number;
  timeManagement: number;
  testingApproach: number;
  feedback?: string;
  overallRating?: number;
}

export interface ScorecardReport {
  sessionId: string;
  totalInterviewers: number;
  scorecards: InterviewScorecard[];
  averageScores: ScorecardScores;
  highestRatedCriteria: string;
  lowestRatedCriteria: string;
}

// ============================================================================
// Anti-Cheat Events
// ============================================================================

export interface AntiCheatEvent {
  id: string;
  sessionId: string;
  participantId: string;
  eventType: AntiCheatEventType;
  severity: number;
  details: Record<string, any>;
  timestamp: Date;
}

export interface AntiCheatReport {
  participantId: string;
  eventCount: number;
  severity: number;
  events: AntiCheatEvent[];
  riskLevel: RiskLevel;
}

// ============================================================================
// Reporting & Export
// ============================================================================

export interface InterviewReport {
  id: string;
  sessionId: string;
  scorecard_id?: string;
  summary?: string;
  shareToken?: string;
  shareExpiry?: Date;
  generatedAt: Date;
  createdAt: Date;
}

export interface ExportRequest {
  format: 'PDF' | 'JSON';
  includeRecording?: boolean;
}

export interface ExportedInterviewData {
  sessionId: string;
  sessionTitle: string;
  status: SessionStatus;
  startedAt?: Date;
  endedAt?: Date;
  duration: number;
  participants: ExportedParticipant[];
  problems: ExportedProblem[];
  submissionCount: number;
  scorecards: InterviewScorecard[];
  antiCheatSummary: AntiCheatSummary;
  recordingDuration?: number;
  codeSnapshotCount?: number;
  eventCount?: number;
}

export interface ExportedParticipant {
  userId: string;
  name: string;
  email: string;
  role: ParticipantRole;
  joinedAt: Date;
}

export interface ExportedProblem {
  id: string;
  title: string;
  difficulty: Difficulty;
}

export interface AntiCheatSummary {
  totalEvents: number;
  eventsByType: Record<string, number>;
  highRiskParticipants: AntiCheatReport[];
}

export interface PublicReportData {
  sessionId: string;
  generatedAt: Date;
  summary?: string;
}

// ============================================================================
// Submission & Execution
// ============================================================================

export interface Submission {
  id: string;
  userId: string;
  problemId: string;
  sessionId?: string;
  language: string;
  code: string;
  verdict: Verdict;
  runtimeMs?: number;
  memoryKb?: number;
  stdout?: string;
  stderr?: string;
  testResults?: TestResult[];
  submittedAt: Date;
}

export interface TestResult {
  input: string;
  expected: string;
  actual?: string;
  passed: boolean;
  error?: string;
}

// ============================================================================
// Request/Response DTOs
// ============================================================================

export interface CreateInterviewRequest {
  title: string;
  problemId?: string;
  templateId?: string;
  role?: string;
  level?: string;
  scheduledAt?: string;
}

export interface UpdateStatusRequest {
  status: SessionStatus;
}

export interface CreateScorecardPayload extends CreateScorecardRequest {
  sessionId: string;
}

export interface DebugAnnotationInput {
  sessionId: string;
  authorId: string;
  authorName: string;
  message: string;
  anchor?: {
    filePath?: string;
    line?: number;
    column?: number;
  } | null;
}

export interface DebugExecutionInput {
  sessionId: string;
  executedById: string;
  executedByName: string;
  code: string;
  language: string;
  annotations?: string[];
}

export interface ExportInterviewRequest {
  format: 'PDF' | 'JSON';
  includeRecording?: boolean;
}

export interface ExtendShareLinkRequest {
  expiryDays?: number;
}

// ============================================================================
// WebSocket Message Payloads
// ============================================================================

export interface JoinRoomPayload {
  sessionId: string;
  userId: string;
  role: ParticipantRole;
}

export interface CodeChangePayload {
  sessionId: string;
  code: string;
  language: string;
}

export interface VerdictUpdatePayload {
  sessionId: string;
  submissionId: string;
  verdict: string;
  testResults: TestResult[];
}

export interface CursorPositionPayload {
  sessionId: string;
  userId: string;
  line: number;
  column: number;
}

export interface TabSwitchPayload {
  sessionId: string;
  participantId: string;
}

export interface CopyAttemptPayload {
  sessionId: string;
  participantId: string;
}

export interface PasteAttemptPayload {
  sessionId: string;
  participantId: string;
}

export interface WindowBlurPayload {
  sessionId: string;
  participantId: string;
}

// ============================================================================
// Response Wrappers
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  statusCode: number;
  message?: string;
}

export interface ApiErrorResponse {
  error: string;
  statusCode: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  INTERVIEWER = 'INTERVIEWER',
  CANDIDATE = 'CANDIDATE',
}

// ============================================================================
// Utility Types
// ============================================================================

export type ScorecardScore = 1 | 2 | 3 | 4 | 5;

export interface CriteriaScore {
  criteria: ScorecardCriteria;
  score: ScorecardScore;
  comment?: string;
}

export interface CoordinatePosition {
  line: number;
  column: number;
}

export interface RemoteCursor {
  userId: string;
  position: CoordinatePosition;
  color: string;
  timestamp: number;
}
