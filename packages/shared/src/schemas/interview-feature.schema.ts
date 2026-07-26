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

/**
 * Debug sessions, skill graphs, evidence trails, benchmarks and quality
 * analytics are owned by `interview.schema.ts`. They are re-exported here so
 * this module's public surface is unchanged, without a second definition that
 * can drift from the first.
 */
export {
  debugAnnotationSchema,
  debugExecutionSchema,
  debugSessionSchema,
  skillNodeSchema,
  skillGraphSchema,
  evidenceTrailItemSchema,
  evidenceTrailSchema,
  benchmarkSummarySchema,
  interviewerBiasSignalSchema,
  qualityAnalyticsSchema,
} from './interview.schema.js';

export type {
  DebugAnnotation,
  DebugExecution,
  DebugSession,
  SkillNode,
  SkillGraph,
  EvidenceTrailItem,
  EvidenceTrail,
  BenchmarkSummary,
  InterviewerBiasSignal,
  QualityAnalytics,
} from './interview.schema.js';

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
