import { createMockIntegrations, isMockBundle, type MockDebug, type MockIntegrationBundle } from "@/lib/integrations/mock/bundle";
import { createRealIntegrations } from "@/lib/integrations/real/bundle";
import type { IntegrationBundle } from "@/lib/integrations/types";

export type IntegrationKind = "mock" | "real";

export function integrationKindFromEnv(value: string | undefined): IntegrationKind {
  return value === "real" ? "real" : "mock";
}

export function createIntegrations(
  kind: IntegrationKind = integrationKindFromEnv(process.env.NEXT_PUBLIC_INTEGRATIONS),
): IntegrationBundle {
  if (kind === "real") return createRealIntegrations();
  return createMockIntegrations();
}

let current: IntegrationBundle | null = null;

export function getIntegrations() {
  current ??= createIntegrations();
  return current;
}

export function getMockDebug(): MockDebug | null {
  if (process.env.NODE_ENV === "production") return null;
  const bundle = getIntegrations();
  return isMockBundle(bundle) ? bundle.debug : null;
}

export function isMockIntegration(value: IntegrationBundle): value is MockIntegrationBundle {
  return isMockBundle(value);
}

export { IntegrationError } from "@/lib/integrations/errors";
export { voiceDedupeLimit } from "@/lib/integrations/mock/voice-feedback";
export {
  errorSeverities,
  isErrorSeverity,
  isMovementErrorCode,
  movementCue,
  movementErrorCodes,
  movementErrorSeverity,
  parseStoredMovementErrors,
  toStoredMovementError,
} from "@/lib/integrations/movement";
export type {
  ConnectionState,
  DisconnectReason,
  IntegrationBundle,
  IntegrationStatus,
  CoachPresence,
  LiveDataMessage,
  LiveEvents,
  LiveParticipant,
  LiveRole,
  LiveRoomProvider,
  LiveSessionEvent,
  LiveToken,
  PoseAnalyzer,
  PoseCallbacks,
  SpeakResult,
  SpeakingState,
  StatusListener,
  StreamQuality,
  Unsubscribe,
  VoiceFeedback,
  VoiceMode,
  VoicePriority,
} from "@/lib/integrations/types";
export type { LiveData } from "@/lib/integrations/live-data";
export type { ErrorSeverity, MovementError, MovementErrorCode, StoredMovementError } from "@/lib/integrations/movement";
export type { MockDebug } from "@/lib/integrations/mock/bundle";
