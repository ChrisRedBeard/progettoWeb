import { createLiveEvents } from "@/lib/integrations/mock/live-events";
import { createLiveRoom } from "@/lib/integrations/mock/live-room";
import { createPoseAnalyzer, type MockClockOptions } from "@/lib/integrations/mock/pose-analyzer";
import { createVoiceFeedback } from "@/lib/integrations/mock/voice-feedback";
import type { DisconnectReason } from "@/lib/integrations/types";
import type { ErrorSeverity, MovementErrorCode } from "@/lib/integrations/movement";
import type { IntegrationBundle } from "@/lib/integrations/types";

export type MockDebug = {
  emitRep: () => void;
  emitError: (input: { code: MovementErrorCode; severity?: ErrorSeverity; repNumber?: number }) => void;
  emitTrackingLost: () => void;
  emitTrackingRecovered: () => void;
  emitFormScore: (score: number) => void;
  setCoachSpeaking: (speaking: boolean) => void;
  setCoachPresent: (present: boolean, displayName?: string) => void;
  dropConnection: () => void;
  forceDisconnect: (reason: DisconnectReason) => void;
  emitSessionStarted: () => void;
  emitSessionEnded: () => void;
  emitPrivacyChanged: (privateLive: boolean) => void;
};

export interface MockIntegrationBundle extends IntegrationBundle {
  readonly kind: "mock";
  debug: MockDebug;
}

export function isMockBundle(value: IntegrationBundle): value is MockIntegrationBundle {
  return "kind" in value && value.kind === "mock";
}

export function createMockIntegrations(options: MockClockOptions = {}): MockIntegrationBundle {
  const session = { id: "debug-session", athleteId: "debug-athlete" };
  const pose = createPoseAnalyzer(options);
  const voice = createVoiceFeedback();
  const room = createLiveRoom({ simulate: options.simulate, session });
  const events = createLiveEvents(session);

  return {
    kind: "mock",
    pose,
    voice,
    room,
    events,
    debug: {
      emitRep: pose.debug.emitRep,
      emitError: pose.debug.emitError,
      emitTrackingLost: pose.debug.emitTrackingLost,
      emitTrackingRecovered: pose.debug.emitTrackingRecovered,
      emitFormScore: pose.debug.emitFormScore,
      setCoachSpeaking: room.debug.setCoachSpeaking,
      setCoachPresent: room.debug.setCoachPresent,
      dropConnection: room.debug.dropConnection,
      forceDisconnect: room.debug.forceDisconnect,
      emitSessionStarted: events.debug.emitSessionStarted,
      emitSessionEnded: events.debug.emitSessionEnded,
      emitPrivacyChanged: events.debug.emitPrivacyChanged,
    },
  };
}
