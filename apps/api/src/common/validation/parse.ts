import { ZodError, type ZodIssue, type ZodTypeAny, type z } from "zod";

import { ValidationError } from "../errors/app-error.js";

export type FieldIssue = {
  path: string;
  message: string;
  code: string;
};

/** Flattens Zod issues into a stable, client-safe shape. */
export function toFieldIssues(error: ZodError): FieldIssue[] {
  return error.issues.map((issue: ZodIssue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
    code: issue.code,
  }));
}

/**
 * Parses `value` against `schema`, converting a Zod failure into a
 * `ValidationError` (HTTP 422) carrying per-field detail.
 *
 * This is the single validation entry point: it always returns the *parsed*
 * value, so callers get coercions and stripped unknown keys rather than the
 * raw input.
 */
export function parseWith<S extends ZodTypeAny>(schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new ValidationError(toFieldIssues(result.error));
  }

  return result.data;
}

/** Non-throwing variant for places that want to branch on validity. */
export function tryParseWith<S extends ZodTypeAny>(
  schema: S,
  value: unknown,
): { ok: true; data: z.infer<S> } | { ok: false; issues: FieldIssue[] } {
  const result = schema.safeParse(value);

  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, issues: toFieldIssues(result.error) };
}
