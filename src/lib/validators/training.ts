import { z } from "zod";
import { CONSENT_VERSION } from "@/lib/consent";
import { storedMovementErrorsSchema } from "@/lib/integrations/movement";

export const feedbackModeSchema = z.enum(["FULL", "CRITICAL_ONLY", "OFF"]);

export const createSessionSchema = z.object({
  exerciseId: z.string().min(1),
  mode: z.enum(["free", "assigned"]),
  assignmentId: z.string().min(1).nullable(),
  workoutExerciseId: z.string().min(1).nullable(),
});

export const setResultBodySchema = z.object({
  exerciseId: z.string().min(1),
  workoutExerciseId: z.string().min(1).nullable(),
  setNumber: z.number().int().positive(),
  repsDone: z.number().int().nonnegative(),
  formScore: z.number().min(0).max(100).nullable(),
  errors: storedMovementErrorsSchema,
  trackingLost: z.boolean(),
  complete: z.boolean(),
});

export const consentBodySchema = z.object({
  version: z.literal(CONSENT_VERSION),
});

export const feedbackBodySchema = z.object({
  mode: feedbackModeSchema,
  sessionId: z.string().min(1).nullable(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type SetResultBody = z.infer<typeof setResultBodySchema>;
export type FeedbackBody = z.infer<typeof feedbackBodySchema>;
