import { z } from "zod";

export const createSessionSchema = z.object({
  title: z.string().min(1).max(200),
  scheduledAt: z.string().datetime().optional(),
});

export const joinSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

export const sessionStatusSchema = z.enum(["SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"]);

export const sessionParticipantSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(["CANDIDATE", "INTERVIEWER", "OBSERVER", "ADMIN"]),
  joinedAt: z.string().datetime(),
});

export const interviewSessionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  creatorId: z.string().min(1),
  status: sessionStatusSchema,
  scheduledAt: z.string().datetime().nullable(),
  startedAt: z.string().datetime().nullable(),
  endedAt: z.string().datetime().nullable(),
  yjsSnapshot: z.string().nullable(),
  participants: z.array(sessionParticipantSchema),
  problemIds: z.array(z.string().min(1)),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type JoinSessionInput = z.infer<typeof joinSessionSchema>;
export type SessionStatus = z.infer<typeof sessionStatusSchema>;
export type SessionParticipant = z.infer<typeof sessionParticipantSchema>;
export type InterviewSession = z.infer<typeof interviewSessionSchema>;
