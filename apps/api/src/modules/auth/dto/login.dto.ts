/**
 * Derived from the shared `loginSchema` so the type and the runtime validation
 * can never disagree. This was previously a hand-written duplicate.
 */
export type { LoginInput as LoginDto } from "@codeforge/shared";
