import { z } from "zod";

// Enums
export const antiCheatEventTypeSchema = z.enum([
  "TAB_SWITCH",
  "COPY_ATTEMPT",
  "PASTE_ATTEMPT",
  "WINDOW_BLUR",
  "EXTERNAL_TOOL_DETECTED",
]);

export const scorecardCriteriaSchema = z.enum([
  "PROBLEM_SOLVING",
  "COMMUNICATION",
  "DEBUGGING",
  "CODE_QUALITY",
  "TIME_MANAGEMENT",
  "TESTING_APPROACH",
]);

export const roleSchema = z.enum(["INTERVIEWER", "CANDIDATE", "OBSERVER"]);

// WebSocket Events
export const codeChangeEventSchema = z.object({
  type: z.literal("code-change"),
  code: z.string(),
  language: z.string(),
  timestamp: z.number(),
});

export const verdictUpdateEventSchema = z.object({
  type: z.literal("verdict-update"),
  submissionId: z.string(),
  verdict: z.string(),
  testResults: z.array(z.any()),
  timestamp: z.number(),
});

export const cursorPositionEventSchema = z.object({
  type: z.literal("cursor-position"),
  userId: z.string(),
  line: z.number(),
  column: z.number(),
  timestamp: z.number(),
});

export const antiCheatSignalSchema = z.object({
  type: z.union([z.literal("tab-switch"), z.literal("copy-paste-attempt")]),
  timestamp: z.number(),
});

export const participantEventSchema = z.object({
  type: z.union([z.literal("participant-joined"), z.literal("participant-left")]),
  userId: z.string(),
  role: roleSchema,
  timestamp: z.number(),
});

export const debugAnnotationSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  message: z.string(),
  anchor: z
    .object({
      filePath: z.string().optional(),
      line: z.number().optional(),
      column: z.number().optional(),
    })
    .nullable(),
  createdAt: z.string().datetime(),
});

export const debugExecutionSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  executedById: z.string(),
  executedByName: z.string(),
  code: z.string(),
  language: z.string(),
  result: z.object({
    verdict: z.string(),
    stdout: z.string(),
    stderr: z.string(),
  }),
  annotations: z.array(z.string()),
  createdAt: z.string().datetime(),
});

export const debugSessionSchema = z.object({
  sessionId: z.string(),
  status: z.enum(['ACTIVE', 'ENDED']),
  participants: z.array(z.string()),
  executions: z.array(debugExecutionSchema),
  annotations: z.array(debugAnnotationSchema),
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const interviewEventSchema = z.union([
  codeChangeEventSchema,
  verdictUpdateEventSchema,
  cursorPositionEventSchema,
  antiCheatSignalSchema,
  participantEventSchema,
  debugExecutionSchema,
  debugAnnotationSchema,
]);

// Scorecard
export const scorecardScoreSchema = z.object({
  criteria: scorecardCriteriaSchema,
  score: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export const scorecardSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  interviewerId: z.string().uuid(),
  candidateId: z.string().uuid(),
  scores: z.array(scorecardScoreSchema),
  feedback: z.string().optional(),
  overallRating: z.number().min(1).max(5).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createScorecardSchema = z.object({
  sessionId: z.string().uuid(),
  scores: z.array(scorecardScoreSchema),
  feedback: z.string().optional(),
  overallRating: z.number().min(1).max(5).optional(),
});

export const skillNodeSchema = z.object({
  round: z.number(),
  sessionId: z.string(),
  role: z.string(),
  level: z.string(),
  score: z.number(),
  difficulty: z.number(),
  createdAt: z.string().datetime(),
});

export const skillGraphSchema = z.object({
  candidateId: z.string(),
  candidateName: z.string().optional(),
  criteriaAverages: z.record(z.number()),
  overallTrajectory: z.array(skillNodeSchema),
  improvementTrend: z.number(),
});

export const evidenceTrailItemSchema = z.object({
  id: z.string(),
  category: z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL']),
  label: z.string(),
  evidence: z.string(),
  source: z.string(),
  weight: z.number(),
});

export const evidenceTrailSchema = z.object({
  sessionId: z.string(),
  candidateId: z.string(),
  recommendation: z.enum(['HIRE', 'NO_HIRE', 'REVIEW']),
  summary: z.string(),
  items: z.array(evidenceTrailItemSchema),
  generatedAt: z.string().datetime(),
});

export const benchmarkSummarySchema = z.object({
  role: z.string(),
  level: z.string(),
  sampleSize: z.number(),
  averageScore: z.number(),
  candidatePercentile: z.number().optional(),
  difficultyAverage: z.number(),
  notes: z.array(z.string()),
});

export const interviewerBiasSignalSchema = z.object({
  interviewerId: z.string(),
  interviewerName: z.string(),
  biasType: z.enum(['LENIENT', 'STRICT', 'HIGH_VARIANCE']),
  signalScore: z.number(),
  evidence: z.string(),
});

export const qualityAnalyticsSchema = z.object({
  rangeDays: z.number(),
  questionDifficultyDrift: z.number(),
  falseNegativeSignals: z.array(z.string()),
  interviewerBiasSignals: z.array(interviewerBiasSignalSchema),
  notes: z.array(z.string()),
});

// Recording & Replay
export const recordingEventSchema = z.object({
  event: interviewEventSchema,
  timestamp: z.number(),
});

export const codeSnapshotSchema = z.object({
  code: z.string(),
  language: z.string(),
  timestamp: z.number(),
  submissionId: z.string().optional(),
});

export const recordingSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  events: z.array(recordingEventSchema),
  codeSnapshots: z.array(codeSnapshotSchema),
  startedAt: z.string().datetime(),
  stoppedAt: z.string().datetime().nullable(),
  duration: z.number(),
});

// Anti-Cheat Event
export const antiCheatEventSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  participantId: z.string().uuid(),
  eventType: antiCheatEventTypeSchema,
  severity: z.number().min(1).max(10),
  details: z.record(z.any()),
  timestamp: z.string().datetime(),
});

// Report & Export
export const interviewReportSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  scorecard: scorecardSchema.optional(),
  summary: z.string().optional(),
  shareToken: z.string().optional(),
  generatedAt: z.string().datetime(),
});

export const exportRequestSchema = z.object({
  sessionId: z.string().uuid(),
  format: z.enum(["PDF", "JSON"]),
  includeRecording: z.boolean().default(false),
});

export const sessionLinkSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  role: roleSchema,
  token: z.string(),
  expiresAt: z.string().datetime().nullable(),
});

export const createSessionLinkSchema = z.object({
  sessionId: z.string().uuid(),
  role: roleSchema,
  expiresIn: z.number().optional(),
});

// Type exports
export type AntiCheatEventType = z.infer<typeof antiCheatEventTypeSchema>;
export type ScorecardCriteria = z.infer<typeof scorecardCriteriaSchema>;
export type InterviewRole = z.infer<typeof roleSchema>;
export type CodeChangeEvent = z.infer<typeof codeChangeEventSchema>;
export type VerdictUpdateEvent = z.infer<typeof verdictUpdateEventSchema>;
export type CursorPositionEvent = z.infer<typeof cursorPositionEventSchema>;
export type InterviewEvent = z.infer<typeof interviewEventSchema>;
export type DebugAnnotation = z.infer<typeof debugAnnotationSchema>;
export type DebugExecution = z.infer<typeof debugExecutionSchema>;
export type DebugSession = z.infer<typeof debugSessionSchema>;
export type ScorecardScore = z.infer<typeof scorecardScoreSchema>;
export type Scorecard = z.infer<typeof scorecardSchema>;
export type CreateScorecardInput = z.infer<typeof createScorecardSchema>;
export type Recording = z.infer<typeof recordingSchema>;
export type RecordingEvent = z.infer<typeof recordingEventSchema>;
export type CodeSnapshot = z.infer<typeof codeSnapshotSchema>;
export type AntiCheatEvent = z.infer<typeof antiCheatEventSchema>;
export type InterviewReport = z.infer<typeof interviewReportSchema>;
export type ExportRequest = z.infer<typeof exportRequestSchema>;
export type SessionLink = z.infer<typeof sessionLinkSchema>;
export type CreateSessionLinkInput = z.infer<typeof createSessionLinkSchema>;
export type SkillNode = z.infer<typeof skillNodeSchema>;
export type SkillGraph = z.infer<typeof skillGraphSchema>;
export type EvidenceTrailItem = z.infer<typeof evidenceTrailItemSchema>;
export type EvidenceTrail = z.infer<typeof evidenceTrailSchema>;
export type BenchmarkSummary = z.infer<typeof benchmarkSummarySchema>;
export type InterviewerBiasSignal = z.infer<typeof interviewerBiasSignalSchema>;
export type QualityAnalytics = z.infer<typeof qualityAnalyticsSchema>;
