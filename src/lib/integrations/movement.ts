import { z } from "zod";
import { IntegrationError } from "@/lib/integrations/errors";

export const movementErrorCodes = ["knees_in", "back_rounded", "depth_insufficient", "tempo_too_fast"] as [
  "knees_in",
  "back_rounded",
  "depth_insufficient",
  "tempo_too_fast",
];

export type MovementErrorCode = (typeof movementErrorCodes)[number];

export const errorSeverities = ["INFO", "WARN", "CRITICAL"] as ["INFO", "WARN", "CRITICAL"];

export type ErrorSeverity = (typeof errorSeverities)[number];

export type MovementError = {
  code: MovementErrorCode;
  severity: ErrorSeverity;
  repNumber: number;
};

export type StoredMovementError = {
  rep: number;
  code: MovementErrorCode;
  severity: ErrorSeverity;
  ignored: boolean;
};

export const movementErrorSeverity: Record<MovementErrorCode, ErrorSeverity> = {
  knees_in: "WARN",
  back_rounded: "CRITICAL",
  depth_insufficient: "WARN",
  tempo_too_fast: "INFO",
};

const movementCues: Record<MovementErrorCode, string> = {
  knees_in: "Ginocchia in dentro. Spingile in linea con i piedi.",
  back_rounded: "Schiena curva. Fermati e raddrizza il busto.",
  depth_insufficient: "Scendi un po' di più.",
  tempo_too_fast: "Rallenta il movimento.",
};

export function movementCue(code: MovementErrorCode) {
  return movementCues[code];
}

export function isMovementErrorCode(value: unknown): value is MovementErrorCode {
  return typeof value === "string" && movementErrorCodes.some((code) => code === value);
}

export function isErrorSeverity(value: unknown): value is ErrorSeverity {
  return value === "INFO" || value === "WARN" || value === "CRITICAL";
}

export const storedMovementErrorSchema = z.object({
  rep: z.number().int().positive(),
  code: z.enum(movementErrorCodes),
  severity: z.enum(errorSeverities),
  ignored: z.boolean(),
});

export const storedMovementErrorsSchema = z.array(storedMovementErrorSchema);

export function toStoredMovementError(error: MovementError, ignored: boolean): StoredMovementError {
  return { rep: error.repNumber, code: error.code, severity: error.severity, ignored };
}

export function parseStoredMovementErrors(value: unknown) {
  const parsed = storedMovementErrorsSchema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: new IntegrationError("INVALID_STATE", "Gli errori salvati non rispettano il formato previsto."),
    };
  }
  return { ok: true as const, errors: parsed.data };
}
