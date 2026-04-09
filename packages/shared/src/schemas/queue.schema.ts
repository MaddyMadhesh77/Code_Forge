import { z } from "zod";
import { executionResultSchema, queuedSubmissionSchema } from "./execution.schema.js";

export const executionQueueJobSchema = z.object({
  jobId: z.string().min(1),
  enqueuedAt: z.string().datetime(),
  submission: queuedSubmissionSchema,
});

export const executionResultEventSchema = z.object({
  jobId: z.string().min(1),
  completedAt: z.string().datetime(),
  result: executionResultSchema,
});

export type ExecutionQueueJob = z.infer<typeof executionQueueJobSchema>;
export type ExecutionResultEvent = z.infer<typeof executionResultEventSchema>;
