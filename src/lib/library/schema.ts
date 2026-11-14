import { z } from "zod";
import { maxVideoBytes } from "@/lib/storage/limits";

export const exerciseInputSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).nullable().optional(),
  defaultSets: z.number().int().min(1).max(20),
  defaultReps: z.number().int().min(1).max(600),
  defaultTempo: z.string().trim().max(20).nullable().optional(),
  defaultRestSeconds: z.number().int().min(0).max(600),
  visibility: z.enum(["PRIVATE", "PUBLIC"]),
  confirmPublic: z.boolean().optional(),
  explanationUploadId: z.string().min(1).nullable().optional(),
  executionUploadId: z.string().min(1).nullable().optional(),
});

export const workoutExerciseInputSchema = z.object({
  id: z.string().min(1).nullable(),
  exerciseId: z.string().min(1),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(600),
  tempo: z.string().trim().max(20).nullable(),
  restSeconds: z.number().int().min(0).max(600),
  notes: z.string().trim().max(300).nullable(),
});

export const workoutSaveSchema = z.object({
  title: z.string().trim().min(1).max(80),
  exercises: z.array(workoutExerciseInputSchema).max(40),
});

export const assignWorkoutSchema = z.object({
  athleteIds: z.array(z.string().min(1)).min(1).max(50),
  confirmClose: z.boolean(),
});

export const uploadRequestSchema = z.object({
  mimeType: z.enum(["video/mp4", "video/webm"]),
  sizeBytes: z.number().int().positive().max(maxVideoBytes),
});

export const workoutTitleSchema = z.object({
  title: z.string().trim().min(1).max(80),
});

export type ExerciseInput = z.infer<typeof exerciseInputSchema>;
export type WorkoutSaveInput = z.infer<typeof workoutSaveSchema>;

export function playableVideoId(video: { id: string; storageKey: string } | null | undefined) {
  if (!video || video.storageKey.startsWith("placeholder:")) return null;
  return video.id;
}
