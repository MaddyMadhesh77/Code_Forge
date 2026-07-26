import type { RequestHandler } from "express";
import type { ZodTypeAny, z } from "zod";

import { parseWith } from "../validation/parse.js";

/**
 * Validates a value against a Zod schema and returns the parsed result.
 *
 * The previous implementation returned its input untouched, which meant every
 * call site believed it was validated when it was not.
 */
export class ZodValidationPipe<S extends ZodTypeAny> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.infer<S> {
    return parseWith(this.schema, value);
  }
}

type RequestPart = "body" | "query" | "params";

/**
 * Express middleware that validates one part of the request and replaces it
 * with the parsed output, so handlers downstream read typed, coerced data.
 *
 * Failures throw `ValidationError`, which the global error handler renders as
 * a 422 with per-field detail.
 */
export function validate<S extends ZodTypeAny>(part: RequestPart, schema: S): RequestHandler {
  return (req, _res, next) => {
    try {
      const parsed = parseWith(schema, req[part]);

      // Express 5 exposes `req.query` via a getter, so define the property
      // rather than assigning through it.
      Object.defineProperty(req, part, {
        value: parsed,
        writable: true,
        configurable: true,
        enumerable: true,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Explicit `RequestHandler` annotations: without them TypeScript infers a type
// that names Express's internal packages, which cannot be written into the
// emitted declarations.
export const validateBody = <S extends ZodTypeAny>(schema: S): RequestHandler =>
  validate("body", schema);

export const validateQuery = <S extends ZodTypeAny>(schema: S): RequestHandler =>
  validate("query", schema);

export const validateParams = <S extends ZodTypeAny>(schema: S): RequestHandler =>
  validate("params", schema);
