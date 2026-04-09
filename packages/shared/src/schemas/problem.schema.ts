import { z } from "zod";

export const difficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);

export const languageSchema = z.enum(["python", "javascript", "cpp", "java"]);

export const problemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  difficulty: difficultySchema,
  constraints: z.string().nullable().optional(),
  starterCode: z.record(z.string()),
  supportedLangs: z.array(languageSchema).min(1),
  isPublished: z.boolean(),
});

export const testCaseSchema = z.object({
  id: z.string().uuid(),
  input: z.string(),
  expected: z.string(),
  isHidden: z.boolean(),
  ordinal: z.number().int().nonnegative(),
});

export const problemWithTestCasesSchema = problemSchema.extend({
  testCases: z.array(testCaseSchema),
});

export type ProblemInput = z.infer<typeof problemSchema>;
export type TestCaseInput = z.infer<typeof testCaseSchema>;
export type ProblemWithTestCases = z.infer<typeof problemWithTestCasesSchema>;
