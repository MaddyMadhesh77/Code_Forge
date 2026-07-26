import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { validateBody, ZodValidationPipe } from "./zod-validation.pipe.js";
import { ValidationError } from "../errors/app-error.js";
import { parseWith, tryParseWith } from "../validation/parse.js";

const schema = z.object({
  email: z.string().email(),
  age: z.coerce.number().int().min(18),
});

describe("Zod validation", () => {
  it("actually validates rather than passing input through", () => {
    const pipe = new ZodValidationPipe(schema);

    // The original pipe returned `value` untouched, so this would have passed.
    expect(() => pipe.transform({ email: "not-an-email", age: 5 })).toThrow(ValidationError);
  });

  it("returns the parsed value with coercions applied", () => {
    const pipe = new ZodValidationPipe(schema);
    const result = pipe.transform({ email: "a@b.com", age: "42" });

    expect(result).toEqual({ email: "a@b.com", age: 42 });
    expect(typeof result.age).toBe("number");
  });

  it("strips unknown keys so mass assignment cannot slip through", () => {
    const result = parseWith(schema, { email: "a@b.com", age: 30, role: "ADMIN" });

    expect(result).not.toHaveProperty("role");
  });

  it("reports per-field issues", () => {
    try {
      parseWith(schema, { email: "nope", age: 2 });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const details = (error as ValidationError).details as Array<{ path: string }>;
      expect(details.map((issue) => issue.path).sort()).toEqual(["age", "email"]);
      expect((error as ValidationError).status).toBe(422);
    }
  });

  it("offers a non-throwing variant", () => {
    expect(tryParseWith(schema, { email: "a@b.com", age: 20 })).toEqual({
      ok: true,
      data: { email: "a@b.com", age: 20 },
    });
    expect(tryParseWith(schema, {}).ok).toBe(false);
  });

  describe("express middleware", () => {
    it("replaces the request part with the parsed value", () => {
      const req = { body: { email: "a@b.com", age: "19" } } as never;
      const next = vi.fn();

      validateBody(schema)(req, {} as never, next);

      expect(next).toHaveBeenCalledWith();
      expect((req as { body: unknown }).body).toEqual({ email: "a@b.com", age: 19 });
    });

    it("forwards a ValidationError to the error handler", () => {
      const req = { body: { email: "bad" } } as never;
      const next = vi.fn();

      validateBody(schema)(req, {} as never, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
    });
  });
});
