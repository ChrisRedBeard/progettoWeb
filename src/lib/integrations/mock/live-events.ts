import { IntegrationError } from "@/lib/integrations/errors";
import { createListeners } from "@/lib/integrations/listeners";
import { createStatus } from "@/lib/integrations/status";
import type { LiveEvents, LiveSessionEvent } from "@/lib/integrations/types";

export type EventsDebug = {
  emitSessionStarted: () => void;
  emitSessionEnded: () => void;
  emitPrivacyChanged: (privateLive: boolean) => void;
};

export function createLiveEvents(session: { id: string; athleteId: string }): LiveEvents & { debug: EventsDebug } {
  const machine = createStatus();
  const listeners = createListeners<[LiveSessionEvent]>();

  function emit(event: LiveSessionEvent) {
    if (machine.status !== "running") {
      throw new IntegrationError("INVALID_STATE", "Il flusso degli eventi non è attivo.");
    }
    listeners.emit(event);
  }

  function stamp(type: LiveSessionEvent["type"], extra: { privateLive?: boolean }): LiveSessionEvent {
    const at = new Date().toISOString();
    if (type === "privacyChanged") {
      return { type, sessionId: session.id, athleteId: session.athleteId, privateLive: extra.privateLive === true, at };
    }
    if (type === "sessionEnded") return { type, sessionId: session.id, athleteId: session.athleteId, at };
    return { type: "sessionStarted", sessionId: session.id, athleteId: session.athleteId, at };
  }

  return {
    get status() {
      return machine.status;
    },
    get lastError() {
      return machine.lastError;
    },
    onStatusChange: machine.onStatusChange,
    subscribe(listener) {
      return listeners.add(listener);
    },
    start() {
      if (machine.status === "running") throw new IntegrationError("INVALID_STATE", "Il flusso eventi è già attivo.");
      machine.set("starting");
      machine.set("running");
    },
    stop() {
      if (machine.status !== "idle") machine.set("idle");
    },
    debug: {
      emitSessionStarted() {
        emit(stamp("sessionStarted", {}));
      },
      emitSessionEnded() {
        emit(stamp("sessionEnded", {}));
      },
      emitPrivacyChanged(privateLive) {
        emit(stamp("privacyChanged", { privateLive }));
      },
    },
  };
}
