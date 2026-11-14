import { IntegrationError } from "@/lib/integrations/errors";
import { movementErrorCodes, movementErrorSeverity, type MovementErrorCode, type ErrorSeverity } from "@/lib/integrations/movement";
import { createStatus } from "@/lib/integrations/status";
import type { PoseAnalyzer, PoseCallbacks } from "@/lib/integrations/types";

export type PoseDebug = {
  emitRep: () => void;
  emitError: (input: { code: MovementErrorCode; severity?: ErrorSeverity; repNumber?: number }) => void;
  emitTrackingLost: () => void;
  emitTrackingRecovered: () => void;
  emitFormScore: (score: number) => void;
};

export type MockClockOptions = {
  simulate?: boolean;
  intervalMs?: number;
  random?: () => number;
};

export function createPoseAnalyzer(options: MockClockOptions = {}): PoseAnalyzer & { debug: PoseDebug } {
  const machine = createStatus();
  const simulate = options.simulate !== false;
  const intervalMs = options.intervalMs ?? 3000;
  const random = options.random ?? Math.random;
  let callbacks: PoseCallbacks | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let reps = 0;
  let lost = false;

  function requireRunning() {
    if (machine.status !== "running" || !callbacks) {
      throw new IntegrationError("INVALID_STATE", "L'analisi del movimento non è in corso.");
    }
    return callbacks;
  }

  function fail(error: IntegrationError): never {
    machine.set("error", error);
    throw error;
  }

  function tick() {
    if (!callbacks || machine.status !== "running") return;
    if (lost) {
      lost = false;
      callbacks.onTrackingRecovered();
      return;
    }
    if (random() < 0.1) {
      lost = true;
      callbacks.onTrackingLost();
      return;
    }
    reps += 1;
    callbacks.onRep(reps);
    callbacks.onFormScore(Math.round(70 + random() * 28));
    if (random() < 0.35) {
      const code = movementErrorCodes[Math.floor(random() * movementErrorCodes.length)];
      if (!code) return;
      callbacks.onError({ code, severity: movementErrorSeverity[code], repNumber: reps });
    }
  }

  const debug: PoseDebug = {
    emitRep() {
      const current = requireRunning();
      reps += 1;
      current.onRep(reps);
    },
    emitError(input) {
      const current = requireRunning();
      current.onError({
        code: input.code,
        severity: input.severity ?? movementErrorSeverity[input.code],
        repNumber: input.repNumber ?? Math.max(reps, 1),
      });
    },
    emitTrackingLost() {
      requireRunning().onTrackingLost();
      lost = true;
    },
    emitTrackingRecovered() {
      requireRunning().onTrackingRecovered();
      lost = false;
    },
    emitFormScore(score) {
      if (score < 0 || score > 100) {
        throw new IntegrationError("INVALID_STATE", "Il punteggio deve stare tra 0 e 100.");
      }
      requireRunning().onFormScore(score);
    },
  };

  return {
    get status() {
      return machine.status;
    },
    get lastError() {
      return machine.lastError;
    },
    onStatusChange: machine.onStatusChange,
    debug,
    start(video, exerciseKey, next) {
      if (machine.status === "running") {
        throw new IntegrationError("INVALID_STATE", "L'analisi è già avviata.");
      }
      machine.set("starting");
      if (!exerciseKey.trim()) fail(new IntegrationError("INVALID_STATE", "Manca la chiave dell'esercizio."));
      if (!video) fail(new IntegrationError("CAMERA_UNAVAILABLE", "Manca il video della camera."));
      callbacks = next;
      reps = 0;
      lost = false;
      machine.set("running");
      if (!simulate) return;
      timer = setInterval(tick, intervalMs);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      callbacks = null;
      lost = false;
      if (machine.status !== "idle") machine.set("idle");
    },
  };
}
