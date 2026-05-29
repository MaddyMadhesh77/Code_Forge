export interface VideoRecorderConfig {
  mimeType?: string;
  maxDurationSec?: number;
  withAudio?: boolean;
}

export interface VideoRecordingResult {
  blob: Blob;
  startedAt: number;
  endedAt: number;
  durationMs: number;
}

export interface RecordingArtifactInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationMs?: number;
  source?: 'webcam' | 'screen';
  storageUrl?: string;
}

export interface RecordingArtifact extends RecordingArtifactInput {
  id: string;
  type: 'video-artifact';
  createdAt: number;
}

export interface DashboardMetric {
  key: string;
  label: string;
  value: string | number;
}

export interface TrendPoint {
  date: string;
  sessions: number;
  submissions: number;
}

export type InterviewTemplateRole = 'FRONTEND' | 'BACKEND' | 'DATA' | 'SDE1' | 'SDE2';

export interface InterviewTemplate {
  id: string;
  title: string;
  role: InterviewTemplateRole;
  level?: string;
  problemIds: string[];
  durationMinutes: number;
  tags: string[];
  rubricNotes: string[];
  isPrivate: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RubricCriterionDraft {
  name: string;
  guidance: string;
  scoreAnchor: string;
}

export interface RubricDraft {
  title: string;
  role: InterviewTemplateRole;
  summary: string;
  notes: string[];
  criteria: RubricCriterionDraft[];
  generatedAt: string;
}

export interface CalibrationInterviewerMetric {
  interviewerId: string;
  interviewerName: string;
  scoreCount: number;
  averageScore: number;
  variance: number;
  rubricDrift: number;
}

export interface CalibrationDashboard {
  rangeDays: number;
  overallAverageScore: number;
  averageVariance: number;
  interviewers: CalibrationInterviewerMetric[];
  notes: string[];
}

export type IntegrationProvider = 'GREENHOUSE' | 'LEVER' | 'WORKDAY';

export interface IntegrationConnection {
  organizationId: string;
  provider: IntegrationProvider;
  externalId: string;
  status: 'CONNECTED' | 'SYNCING' | 'FAILED';
  lastSyncedAt?: string;
  candidateMappings: Record<string, string>;
  notes?: string;
}

export type BillingPlanType = 'USAGE' | 'SEAT' | 'HYBRID';

export interface BillingPlan {
  id: string;
  name: string;
  type: BillingPlanType;
  currency: 'USD';
  monthlySeatPrice: number;
  usageUnitPrice: number;
  includedUsageUnits: number;
}

export interface BillingSummary {
  organizationId: string;
  plan: BillingPlan;
  seatCount: number;
  usageUnits: number;
  seatChargeMonthly: number;
  usageChargeMonthly: number;
  estimatedMonthlyTotal: number;
  updatedAt: string;
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
  createdAt: string;
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
  createdAt: string;
}

export interface DebugSession {
  sessionId: string;
  status: 'ACTIVE' | 'ENDED';
  participants: string[];
  executions: DebugExecution[];
  annotations: DebugAnnotation[];
  startedAt: string;
  updatedAt: string;
}

export interface SkillNode {
  round: number;
  sessionId: string;
  role: string;
  level: string;
  score: number;
  difficulty: number;
  createdAt: string;
}

export interface SkillGraph {
  candidateId: string;
  candidateName?: string;
  criteriaAverages: Record<string, number>;
  overallTrajectory: SkillNode[];
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
  generatedAt: string;
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
