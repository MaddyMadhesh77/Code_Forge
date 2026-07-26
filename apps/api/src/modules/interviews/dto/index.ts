import { z } from "zod";

/**
 * Interview request shapes.
 *
 * These were `class-validator`-decorated classes, but `class-validator` was
 * never installed — only type-shimmed — so the decorators validated nothing at
 * runtime while looking like they did. They are now Zod schemas that actually
 * run, with the types derived via `z.infer` so shape and validation cannot
 * drift apart.
 */

export const scorecardCriteriaSchema = z.enum([
  "PROBLEM_SOLVING",
  "COMMUNICATION",
  "DEBUGGING",
  "CODE_QUALITY",
  "TIME_MANAGEMENT",
  "TESTING_APPROACH",
]);

export type ScorecardCriteriaValue = z.infer<typeof scorecardCriteriaSchema>;

const rubricScore = z.number().int().min(1).max(5);

export const createInterviewSchema = z.object({
  title: z.string().min(1).max(200),
  problemId: z.string().uuid().optional(),
  templateId: z.string().min(1).max(200).optional(),
  role: z.string().min(1).max(50).optional(),
  level: z.string().min(1).max(50).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const createSessionLinkSchema = z.object({
  role: z.enum(["INTERVIEWER", "CANDIDATE", "OBSERVER"]).default("CANDIDATE"),
  /** Seconds until the link expires; the service clamps this to a safe range. */
  expiresIn: z.number().int().positive().optional(),
});

export const joinInterviewSchema = z.object({
  token: z.string().min(16).max(500),
});

export const createScorecardSchema = z.object({
  criteria: z.array(scorecardCriteriaSchema).optional(),
  problemSolving: rubricScore,
  communication: rubricScore,
  debugging: rubricScore,
  codeQuality: rubricScore,
  timeManagement: rubricScore,
  testingApproach: rubricScore,
  feedback: z.string().max(20_000).optional(),
  overallRating: rubricScore.optional(),
});

export const exportInterviewSchema = z.object({
  format: z.enum(["PDF", "JSON"]),
  includeRecording: z.boolean().default(false),
});

export const updateInterviewStatusSchema = z.object({
  status: z.enum(["SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"]),
});

export const analyzeComplexitySchema = z.object({
  code: z.string().min(1).max(200_000),
  /** Selects the brace- or indentation-based nesting analysis. */
  language: z.string().min(1).max(30).optional(),
});

export const reviewCodeSchema = z.object({
  code: z.string().min(1).max(200_000),
  language: z.string().min(1).max(30),
});

export const sendInviteEmailSchema = z.object({
  to: z.string().email(),
  candidateName: z.string().min(1).max(200),
  interviewerName: z.string().min(1).max(200),
  sessionTitle: z.string().min(1).max(200),
  interviewLink: z.string().url(),
  scheduledAt: z.string().datetime().optional(),
});

export const sendReportEmailSchema = z.object({
  to: z.string().email(),
  sessionTitle: z.string().min(1).max(200),
  reportUrl: z.string().url(),
});

export const uploadRecordingArtifactSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  // Bounded so a client cannot claim an implausible size.
  sizeBytes: z.number().int().min(1).max(5_000_000_000),
  durationMs: z.number().int().min(0).optional(),
  source: z.enum(["webcam", "screen"]).optional(),
  storageUrl: z.string().url().optional(),
});

export type CreateInterviewDto = z.infer<typeof createInterviewSchema>;
export type CreateSessionLinkDto = z.infer<typeof createSessionLinkSchema>;
export type JoinInterviewDto = z.infer<typeof joinInterviewSchema>;
export type CreateScorecardDto = z.infer<typeof createScorecardSchema>;
export type ExportInterviewDto = z.infer<typeof exportInterviewSchema>;
export type UpdateInterviewStatusDto = z.infer<typeof updateInterviewStatusSchema>;
export type AnalyzeComplexityDto = z.infer<typeof analyzeComplexitySchema>;
export type ReviewCodeDto = z.infer<typeof reviewCodeSchema>;
export type SendInviteEmailDto = z.infer<typeof sendInviteEmailSchema>;
export type SendReportEmailDto = z.infer<typeof sendReportEmailSchema>;
export type UploadRecordingArtifactDto = z.infer<typeof uploadRecordingArtifactSchema>;
