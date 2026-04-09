export const verdicts = [
  "PENDING",
  "ACCEPTED",
  "WRONG_ANSWER",
  "TIME_LIMIT_EXCEEDED",
  "MEMORY_LIMIT_EXCEEDED",
  "RUNTIME_ERROR",
  "COMPILATION_ERROR",
  "INTERNAL_ERROR",
] as const;

export type Verdict = (typeof verdicts)[number];
