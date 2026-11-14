import { z } from "zod";
import { IntegrationError } from "@/lib/integrations/errors";
import { errorSeverities, movementErrorCodes, movementErrorSeverity } from "@/lib/integrations/movement";

export const liveDataSchema = z.object({
  repCount: z.number().int().nonnegative(),
  formScore: z.number().min(0).max(100).nullable(),
  error: z
    .object({
      code: z.enum(movementErrorCodes),
      severity: z.enum(errorSeverities),
    })
    .nullable(),
  phase: z.enum(["set", "recovery"]),
});

export type LiveData = z.infer<typeof liveDataSchema>;

export function parseLiveData(value: unknown) {
  const parsed = liveDataSchema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: new IntegrationError("INVALID_STATE", "Dati della diretta non validi."),
    };
  }
  return { ok: true as const, data: parsed.data };
}

export function publishIsAllowed(
  publish: { audio: boolean; video: boolean },
  tracks: { audio: number; video: number },
) {
  if (!publish.video && tracks.video > 0) return false;
  if (!publish.audio && tracks.audio > 0) return false;
  return true;
}

// Serie da 8 ripetizioni, poi il recupero. Gli errori usano la gravità già associata a ciascun codice.
export const demoLiveScript: LiveData[] = [
  { repCount: 1, formScore: 94, error: null, phase: "set" },
  { repCount: 2, formScore: 90, error: null, phase: "set" },
  { repCount: 3, formScore: 74, error: { code: "knees_in", severity: movementErrorSeverity.knees_in }, phase: "set" },
  { repCount: 4, formScore: 86, error: null, phase: "set" },
  { repCount: 5, formScore: 81, error: { code: "depth_insufficient", severity: movementErrorSeverity.depth_insufficient }, phase: "set" },
  { repCount: 6, formScore: 89, error: null, phase: "set" },
  { repCount: 7, formScore: 70, error: { code: "back_rounded", severity: movementErrorSeverity.back_rounded }, phase: "set" },
  { repCount: 8, formScore: 92, error: null, phase: "set" },
  { repCount: 8, formScore: 92, error: null, phase: "recovery" },
];
