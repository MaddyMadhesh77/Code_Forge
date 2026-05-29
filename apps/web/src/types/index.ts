export type Role = 'CANDIDATE' | 'INTERVIEWER' | 'ADMIN';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type Verdict =
  | 'PENDING'
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'RUNTIME_ERROR'
  | 'COMPILATION_ERROR'
  | 'INTERNAL_ERROR';
export type SessionStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type Language = 'python' | 'javascript' | 'cpp' | 'java' | 'typescript';
export type SessionRole = 'INTERVIEWER' | 'CANDIDATE' | 'OBSERVER';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ReplayEventKind = 'code' | 'media' | 'chat' | 'note' | 'system';
export type ReplayMessageRole = 'candidate' | 'interviewer' | 'observer' | 'system';
export type UserStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';
export type JobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: Role;
}

export interface TeamUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: Role;
  status: UserStatus;
  lastActiveAt?: string;
  title?: string;
  department?: string;
}

export interface UserActivityItem {
  id: string;
  timestamp: string;
  action: string;
  details: string;
}

export interface UserListResponse {
  items: TeamUser[];
  total: number;
}

export interface CurrentUserProfile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  title?: string;
  phone?: string;
  timezone?: string;
  twoFactorEnabled: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface OrgSettings {
  id: string;
  name: string;
  retentionDays: number;
  auditForwarding: boolean;
  allowGuestAccess: boolean;
  timezone: string;
  slackWebhookEnabled: boolean;
}

export interface ReplayEvent {
  id: string;
  timeMs: number;
  kind: ReplayEventKind;
  title: string;
  detail: string;
  code?: string;
  diff?: string;
}

export interface ReplayRecording {
  id: string;
  label: string;
  kind: 'screen' | 'camera' | 'audio';
  mimeType: string;
  durationMs: number;
  storageUrl?: string;
}

export interface ReplayChatMessage {
  id: string;
  role: ReplayMessageRole;
  author: string;
  text: string;
  timestamp: string;
}

export interface ReplayNote {
  id: string;
  author: string;
  note: string;
  timestamp: string;
  timeMs: number;
}

export interface ReplayActivityItem {
  id: string;
  timestamp: string;
  message: string;
  level: 'info' | 'success' | 'warning';
}

export interface SessionReplayData {
  sessionId: string;
  title: string;
  startedAt: string;
  endedAt?: string;
  events: ReplayEvent[];
  recordings: ReplayRecording[];
  chat: ReplayChatMessage[];
  notes: ReplayNote[];
  activityLog: ReplayActivityItem[];
}

export interface QueueJob {
  id: string;
  type: string;
  state: JobState;
  attempts: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  payloadSummary: string;
  worker?: string;
}

export interface QueueJobLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface QueueJobsResponse {
  items: QueueJob[];
  total: number;
}

export interface MetricsErrorItem {
  id: string;
  service: string;
  message: string;
  count: number;
  lastSeenAt: string;
}

export interface TopProblemItem {
  id: string;
  title: string;
  submissions: number;
  acceptanceRate: number;
}

export interface Problem {
  id: string;
  title: string;
  slug: string;
  description: string;
  statement?: string;
  difficulty: Difficulty;
  constraints?: string;
  notes?: string;
  tags?: string[];
  samples?: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  templates?: Array<{
    language: Language;
    code: string;
  }>;
  editorial?: string;
  supportedLangs: Language[];
  isPublished: boolean;
}

export interface ExecutionTestResult {
  id?: string;
  name?: string;
  status: 'PASSED' | 'FAILED' | 'ERROR';
  input?: string;
  expected?: string;
  actual?: string;
  runtimeMs?: number;
}

export interface ExecutionRunResult {
  runId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  stdout: string;
  stderr: string;
  tests: ExecutionTestResult[];
  runtimeMs?: number;
  createdAt?: string;
}

export interface Submission {
  id: string;
  userId: string;
  problemId: string;
  language: Language;
  verdict: Verdict;
  runtimeMs?: number;
  memoryKb?: number;
  submittedAt: string;
}

export interface InterviewSession {
  id: string;
  title: string;
  creatorId: string;
  creatorName: string;
  status: SessionStatus;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  participantCount: number;
  participants?: Array<{
    id?: string;
    userId: string;
    displayName?: string;
    role: SessionRole;
    joinedAt?: string;
    isConnected?: boolean;
  }>;
  permissions?: {
    canEndSession?: boolean;
    canRecord?: boolean;
    canRunCode?: boolean;
    canEditCode?: boolean;
  };
  problemId?: string;
  role?: string;
  level?: string;
}

export interface InterviewJoinResponse {
  sessionToken: string;
  rtcConfig: {
    iceServers?: Array<{ urls: string | string[]; username?: string; credential?: string }>;
    turnRequired?: boolean;
  };
}

export interface DashboardMetrics {
  totalProblems: number;
  activeSessions: number;
  submissionsToday: number;
  acceptanceRate: number;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface DashboardOverview {
  activeSessions: number;
  interviewsToday: number;
  queuedJobs: number;
  avgExecTime: number;
  trendSeries: TrendPoint[];
}

export interface UsageMetrics {
  range: string;
  series: TrendPoint[];
}

export interface ProblemListItem {
  id: string;
  title: string;
  slug: string;
  difficulty: Difficulty;
  tags: string[];
  author: string;
  updatedAt: string;
}

export interface ProblemListResponse {
  items: ProblemListItem[];
  total: number;
}

// ── Session Links ──────────────────────────────────────────────────────────────
export interface SessionLink {
  id: string;
  sessionId: string;
  token: string;
  role: SessionRole;
  expiresAt?: string;
  isRevoked: boolean;
  createdAt: string;
}

// ── Scorecard ──────────────────────────────────────────────────────────────────
export interface ScorecardCriteria {
  name: string;
  score: number; // 1-5
  notes?: string;
}

export interface Scorecard {
  id: string;
  sessionId: string;
  interviewerId: string;
  candidateId: string;
  criteria: ScorecardCriteria[];
  problemSolving: number;
  communication: number;
  debugging: number;
  codeQuality: number;
  timeManagement: number;
  testingApproach: number;
  overallRating?: number;
  feedback?: string;
  createdAt: string;
  scores?: Record<string, number>;
}

export interface ScorecardReport {
  sessionId: string;
  totalInterviewers: number;
  scorecards: Scorecard[];
  averageScores: Record<string, number>;
  highestRatedCriteria: string;
  lowestRatedCriteria: string;
}

// ── Anti-Cheat ─────────────────────────────────────────────────────────────────
export type AntiCheatEventType =
  | 'TAB_SWITCH'
  | 'COPY_ATTEMPT'
  | 'PASTE_ATTEMPT'
  | 'WINDOW_BLUR'
  | 'EXTERNAL_TOOL_DETECTED';

export interface AntiCheatEvent {
  id: string;
  sessionId: string;
  participantId: string;
  eventType: AntiCheatEventType;
  severity: number; // 1-5
  details: Record<string, unknown>;
  timestamp: string;
}

export interface AntiCheatParticipantReport {
  participantId: string;
  eventCount: number;
  severity: number;
  events: AntiCheatEvent[];
  riskLevel: RiskLevel;
}

// ── Recording ──────────────────────────────────────────────────────────────────
export interface RecordingArtifact {
  id: string;
  sessionId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationMs?: number;
  source: 'webcam' | 'screen';
  storageUrl?: string;
  createdAt: string;
}

export interface SessionRecording {
  id: string;
  events: unknown[];
  codeSnapshots: unknown[];
  startedAt: string;
  stoppedAt: string | null;
  duration: number;
}

// ── Report ─────────────────────────────────────────────────────────────────────
export interface InterviewReport {
  id: string;
  sessionId: string;
  shareToken: string | null;
  shareExpiry: string | null;
  generatedAt: string;
  summary?: string;
}

// ── AI Analysis ────────────────────────────────────────────────────────────────
export interface AIReviewIssue {
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  category: string;
  message: string;
  line?: number;
}

export interface AIReviewResult {
  score: number; // 0-100
  issues: AIReviewIssue[];
  suggestions: string[];
  summary: string;
}

export interface ComplexityResult {
  timeComplexity: string;
  spaceComplexity: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  explanation: string;
}

// ── Analytics ──────────────────────────────────────────────────────────────────
export interface AnalyticsSummary {
  totalSessions: number;
  completionRate: number;
  avgDurationMinutes: number;
  totalSubmissions: number;
}

export interface AnalyticsDashboardData {
  rangeDays: number;
  summary: AnalyticsSummary;
  submissionsByLanguage: Record<string, number>;
  sessionsByStatus: Record<string, number>;
  dailySessions: Array<{ date: string; count: number }>;
}

// ── Webhook ────────────────────────────────────────────────────────────────────
export interface Webhook {
  id: string;
  url: string;
  events: string[];
}
