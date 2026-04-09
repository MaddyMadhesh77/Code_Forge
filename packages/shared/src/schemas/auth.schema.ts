import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(80),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  role: z.enum(["CANDIDATE", "INTERVIEWER", "ADMIN"]),
});

export const authTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresInSeconds: z.number().int().positive(),
});

export const authSessionSchema = z.object({
  user: authUserSchema,
  tokens: authTokensSchema,
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
