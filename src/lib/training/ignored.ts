import type { ErrorSeverity, MovementErrorCode } from "@/lib/integrations/movement";

export const ignoredWindowReps = 3;

export type VoicedMark = {
  code: MovementErrorCode;
  rep: number;
};

export function isIgnoredError(input: {
  code: MovementErrorCode;
  severity: ErrorSeverity;
  repNumber: number;
  voiced: readonly VoicedMark[];
  deduped: boolean;
}) {
  if (input.severity === "CRITICAL") return false;
  if (input.deduped) return true;
  const last = [...input.voiced].reverse().find((mark) => mark.code === input.code);
  if (!last) return false;
  const distance = input.repNumber - last.rep;
  return distance >= 1 && distance <= ignoredWindowReps;
}
