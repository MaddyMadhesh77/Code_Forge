import { z } from "zod";

/**
 * Request schemas for the HTTP surface.
 *
 * These are the *only* definition of each request shape: the previous code
 * declared overlapping DTOs as Zod schemas, class-validator classes and hand-
 * written interfaces, which drifted apart. Handler argument types are inferred
 * from these with `z.infer`.
 */

export const idParam = z.object({ id: z.string().min(1).max(200) });

export const paginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export const difficultyEnum = z.enum(["EASY", "MEDIUM", "HARD"]);
export const participantRoleEnum = z.enum(["INTERVIEWER", "CANDIDATE", "OBSERVER"]);
export const sessionStatusEnum = z.enum(["SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"]);
export const languageEnum = z.enum(["python", "javascript", "typescript", "cpp", "java"]);

// --- Auth ---------------------------------------------------------------

export const refreshTokenBody = z.object({
  refreshToken: z.string().min(1),
});

// --- Problems -----------------------------------------------------------

export const listProblemsQuery = paginationQuery.extend({
  difficulty: difficultyEnum.optional(),
  tag: z.string().min(1).max(50).optional(),
  search: z.string().min(1).max(200).optional(),
});

export const problemSample = z.object({
  input: z.string().max(5_000),
  output: z.string().max(5_000),
  explanation: z.string().max(5_000).optional(),
});

export const createProblemBody = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(1).max(50_000),
  difficulty: difficultyEnum,
  constraints: z.string().max(5_000).nullish(),
  starterCode: z.record(z.string(), z.string().max(50_000)).optional(),
  supportedLangs: z.array(languageEnum).min(1).max(10).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  samples: z.array(problemSample).max(10).optional(),
  hints: z.array(z.string().max(2_000)).max(10).optional(),
  editorial: z.string().max(50_000).nullish(),
  visibility: z.enum(["PRIVATE", "TEAM", "PUBLIC"]).optional(),
  teamId: z.string().min(1).max(100).nullish(),
  isPublished: z.boolean().optional(),
});

// `.partial()` on the create shape keeps update in lockstep automatically.
export const updateProblemBody = createProblemBody.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field must be provided" },
);

export const solutionsQuery = z.object({
  lang: languageEnum.optional(),
});

export const bookmarkBody = z.object({
  bookmarked: z.boolean().default(true),
});

export const testCaseBody = z.object({
  input: z.string().max(100_000),
  expected: z.string().max(100_000),
  isHidden: z.boolean().default(true),
});

// --- Execution ----------------------------------------------------------

export const runCodeBody = z.object({
  problemId: z.string().min(1).max(200),
  language: languageEnum,
  // Bounded so a submission cannot be used to push megabytes through the queue.
  code: z.string().min(1).max(200_000),
  sessionId: z.string().uuid().optional(),
});

// --- Sessions / interviews ----------------------------------------------

export const startInterviewBody = z.object({
  problemId: z.string().min(1).max(200),
  title: z.string().min(1).max(200).optional(),
  mode: z.enum(["live", "async"]).default("live"),
  scheduledAt: z.string().datetime().optional(),
  participantIds: z.array(z.string().uuid()).max(20).default([]),
});

export const joinInterviewBody = z.object({
  role: participantRoleEnum.default("CANDIDATE"),
});

export const updateSessionStatusBody = z.object({
  status: sessionStatusEnum,
});

export const noteBody = z.object({
  note: z.string().min(1).max(10_000),
});

export const ratingBody = z.object({
  // Rubric dimension -> 1..5. Bounding the values is what makes an aggregate
  // score meaningful.
  scores: z.record(z.string().min(1).max(50), z.number().int().min(1).max(5)),
  overall: z.number().int().min(1).max(5),
  recommendation: z
    .enum(["STRONG_NO", "NO", "NO_DECISION", "YES", "STRONG_YES"])
    .default("NO_DECISION"),
  feedback: z.string().max(20_000).default(""),
});

export const snapshotBody = z.object({
  snapshot: z.string().max(5_000_000),
});

// --- Operator / enterprise ----------------------------------------------

export const auditQuery = z.object({
  limit: z.coerce.number().int().min(1).max(2000).default(200),
});

export const tenantParam = z.object({
  // Mirrors the filesystem-safe pattern enforced in `audit-paths.ts`.
  tenant: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/, "Invalid tenant identifier"),
});

export const createWebhookBody = z.object({
  // http(s) only: a `file://` or `gopher://` target would be an SSRF primitive.
  url: z
    .string()
    .url()
    .refine((value) => /^https?:\/\//i.test(value), "URL must use http or https"),
  events: z.array(z.string().min(1).max(100)).min(1).max(50),
});

export const oidcCallbackBody = z.object({
  code: z.string().min(1).max(2_000),
  state: z.string().min(1).max(500),
});

export const scimUserBody = z.object({
  userName: z.string().email().optional(),
  emails: z.array(z.object({ value: z.string().email() })).optional(),
  displayName: z.string().max(200).optional(),
  active: z.boolean().optional(),
});

export const scimPatchBody = z.object({
  Operations: z
    .array(
      z.object({
        op: z.string(),
        path: z.string().optional(),
        value: z.unknown().optional(),
      }),
    )
    .max(50),
});

export type ListProblemsQuery = z.infer<typeof listProblemsQuery>;
export type CreateProblemBody = z.infer<typeof createProblemBody>;
export type UpdateProblemBody = z.infer<typeof updateProblemBody>;
export type RunCodeBody = z.infer<typeof runCodeBody>;
export type StartInterviewBody = z.infer<typeof startInterviewBody>;
export type RatingBody = z.infer<typeof ratingBody>;
