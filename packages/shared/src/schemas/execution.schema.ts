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

export const executionResultSchema = z.object({
  submissionId: z.string().min(1),
  verdict: z.enum(verdicts),
  runtimeMs: z.number().int().nonnegative(),
  memoryKb: z.number().int().nonnegative(),
  stdout: z.string(),
  stderr: z.string(),
});

export type ExecutionResult = z.infer<typeof executionResultSchema>;
