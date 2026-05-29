import { z } from 'zod';

export const complexityAnalysisSchema = z.object({
  timeComplexity: z.string(),
  spaceComplexity: z.string(),
  confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  notes: z.array(z.string()),
});

export const codeReviewIssueSchema = z.object({
  category: z.enum(['SECURITY', 'PERFORMANCE', 'STYLE', 'CORRECTNESS']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  message: z.string(),
});

export const codeReviewResultSchema = z.object({
  score: z.number().min(0).max(100),
  issues: z.array(codeReviewIssueSchema),
  complexity: complexityAnalysisSchema,
  recommendations: z.array(z.string()),
});

export const interviewEmailInviteSchema = z.object({
  to: z.string().email(),
  candidateName: z.string(),
  interviewerName: z.string(),
  sessionTitle: z.string(),
  interviewLink: z.string().url(),
  scheduledAt: z.string().optional(),
});

export const interviewEmailReportSchema = z.object({
  to: z.string().email(),
  sessionTitle: z.string(),
  reportUrl: z.string().url(),
});

export const interviewAnalyticsDashboardSchema = z.object({
  rangeDays: z.number(),
  summary: z.object({
    totalSessions: z.number(),
    completedSessions: z.number(),
    completionRate: z.number(),
    avgDurationMinutes: z.number(),
    totalSubmissions: z.number(),
  }),
  submissionsByLanguage: z.record(z.number()),
  verdictBreakdown: z.record(z.number()),
  dailyTrend: z.array(
    z.object({
      date: z.string(),
      sessions: z.number(),
      submissions: z.number(),
    }),
  ),
});

export const recordingArtifactSchema = z.object({
  id: z.string(),
  type: z.literal('video-artifact'),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  durationMs: z.number().optional(),
  source: z.enum(['webcam', 'screen']).optional(),
  storageUrl: z.string().optional(),
  createdAt: z.number(),
});

export const interviewTemplateRoleSchema = z.enum(['FRONTEND', 'BACKEND', 'DATA', 'SDE1', 'SDE2']);

export const interviewTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  role: interviewTemplateRoleSchema,
  level: z.string().optional(),
  problemIds: z.array(z.string()),
  durationMinutes: z.number(),
  tags: z.array(z.string()),
  rubricNotes: z.array(z.string()),
  isPrivate: z.boolean(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const rubricDraftSchema = z.object({
  title: z.string(),
  role: interviewTemplateRoleSchema,
  summary: z.string(),
  notes: z.array(z.string()),
  criteria: z.array(
    z.object({
      name: z.string(),
      guidance: z.string(),
      scoreAnchor: z.string(),
    }),
  ),
  generatedAt: z.string(),
});

export const calibrationInterviewerSchema = z.object({
  interviewerId: z.string(),
  interviewerName: z.string(),
  scoreCount: z.number(),
  averageScore: z.number(),
  variance: z.number(),
  rubricDrift: z.number(),
});

export const calibrationDashboardSchema = z.object({
  rangeDays: z.number(),
  overallAverageScore: z.number(),
  averageVariance: z.number(),
  interviewers: z.array(calibrationInterviewerSchema),
  notes: z.array(z.string()),
});

export const integrationProviderSchema = z.enum(['GREENHOUSE', 'LEVER', 'WORKDAY']);

export const integrationConnectionSchema = z.object({
  organizationId: z.string(),
  provider: integrationProviderSchema,
  externalId: z.string(),
  status: z.enum(['CONNECTED', 'SYNCING', 'FAILED']),
  lastSyncedAt: z.string().optional(),
  candidateMappings: z.record(z.string()),
  notes: z.string().optional(),
});

export const billingPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['USAGE', 'SEAT', 'HYBRID']),
  currency: z.literal('USD'),
  monthlySeatPrice: z.number(),
  usageUnitPrice: z.number(),
  includedUsageUnits: z.number(),
});

export const billingSummarySchema = z.object({
  organizationId: z.string(),
  plan: billingPlanSchema,
  seatCount: z.number(),
  usageUnits: z.number(),
  seatChargeMonthly: z.number(),
  usageChargeMonthly: z.number(),
  estimatedMonthlyTotal: z.number(),
  updatedAt: z.string(),
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
  createdAt: z.string(),
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
  createdAt: z.string(),
});

export const debugSessionSchema = z.object({
  sessionId: z.string(),
  status: z.enum(['ACTIVE', 'ENDED']),
  participants: z.array(z.string()),
  executions: z.array(debugExecutionSchema),
  annotations: z.array(debugAnnotationSchema),
  startedAt: z.string(),
  updatedAt: z.string(),
});

export const skillNodeSchema = z.object({
  round: z.number(),
  sessionId: z.string(),
  role: z.string(),
  level: z.string(),
  score: z.number(),
  difficulty: z.number(),
  createdAt: z.string(),
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
  generatedAt: z.string(),
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

export type ComplexityAnalysis = z.infer<typeof complexityAnalysisSchema>;
export type CodeReviewIssue = z.infer<typeof codeReviewIssueSchema>;
export type CodeReviewResult = z.infer<typeof codeReviewResultSchema>;
export type InterviewEmailInvite = z.infer<typeof interviewEmailInviteSchema>;
export type InterviewEmailReport = z.infer<typeof interviewEmailReportSchema>;
export type InterviewAnalyticsDashboard = z.infer<typeof interviewAnalyticsDashboardSchema>;
export type RecordingArtifactSchemaType = z.infer<typeof recordingArtifactSchema>;
export type InterviewTemplateRole = z.infer<typeof interviewTemplateRoleSchema>;
export type InterviewTemplate = z.infer<typeof interviewTemplateSchema>;
export type RubricDraft = z.infer<typeof rubricDraftSchema>;
export type CalibrationDashboard = z.infer<typeof calibrationDashboardSchema>;
export type IntegrationProvider = z.infer<typeof integrationProviderSchema>;
export type IntegrationConnection = z.infer<typeof integrationConnectionSchema>;
export type BillingPlan = z.infer<typeof billingPlanSchema>;
export type BillingSummary = z.infer<typeof billingSummarySchema>;
export type DebugAnnotation = z.infer<typeof debugAnnotationSchema>;
export type DebugExecution = z.infer<typeof debugExecutionSchema>;
export type DebugSession = z.infer<typeof debugSessionSchema>;
export type SkillGraph = z.infer<typeof skillGraphSchema>;
export type EvidenceTrail = z.infer<typeof evidenceTrailSchema>;
export type BenchmarkSummary = z.infer<typeof benchmarkSummarySchema>;
export type QualityAnalytics = z.infer<typeof qualityAnalyticsSchema>;
