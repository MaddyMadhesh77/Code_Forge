import { z } from "zod";
import { languageSchema } from "./problem.schema.js";
import { verdicts } from "../constants/verdicts.js";

export const submitCodeSchema = z.object({
  problemId: z.string().uuid(),
  sessionId: z.string().min(1).optional(),
  language: languageSchema,
  code: z.string().min(1),
  timeoutMs: z.number().int().positive().max(10000).default(10000),
  memoryLimitMb: z.number().int().positive().max(256).default(256),
});

export type SubmitCodeInput = z.infer<typeof submitCodeSchema>;

export const queuedSubmissionSchema = submitCodeSchema.extend({
  submissionId: z.string().min(1),
  status: z.literal("queued"),
  queuedAt: z.string().datetime(),
});

export type QueuedSubmission = z.infer<typeof queuedSubmissionSchema>;

export const testCaseResultSchema = z.object({
  name: z.string().optional(),
  input: z.string().optional(),
  expected: z.string().optional(),
  actual: z.string().optional(),
  passed: z.boolean(),
  runtimeMs: z.number().int().nonnegative().optional(),
  message: z.string().optional(),
});

export type TestCaseResult = z.infer<typeof testCaseResultSchema>;

export const executionResultSchema = z.object({
  submissionId: z.string().min(1),
  verdict: z.enum(verdicts),
  runtimeMs: z.number().int().nonnegative(),
  memoryKb: z.number().int().nonnegative(),
  stdout: z.string(),
  stderr: z.string(),
  /// Per-test outcomes. The worker has always emitted these; the schema
  /// omitted them, so the field was silently dropped from the typed contract.
  testResults: z.array(testCaseResultSchema).default([]),
  executedAt: z.string().datetime().optional(),
});

export type ExecutionResult = z.infer<typeof executionResultSchema>;
