import { IntegrationError } from "@/lib/integrations/errors";
import { isErrorSeverity, isMovementErrorCode } from "@/lib/integrations/movement";
import { createListeners } from "@/lib/integrations/listeners";
import { createStatus } from "@/lib/integrations/status";
import type { SpeakResult, VoiceFeedback, VoiceMode } from "@/lib/integrations/types";

export const voiceDedupeLimit = 3;
const captionMs = 4000;

export function createVoiceFeedback(): VoiceFeedback {
  const machine = createStatus();
  const speakingListeners = createListeners<[{ speaking: boolean; text: string | null }]>();
  const counts = new Map<string, number>();
  let mode: VoiceMode = "FULL";
  let paused = false;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  function clearCaption() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
    speakingListeners.emit({ speaking: false, text: null });
  }

  return {
    get status() {
      return machine.status;
    },
    get lastError() {
      return machine.lastError;
    },
    onStatusChange: machine.onStatusChange,
    get mode() {
      return mode;
    },
    get paused() {
      return paused;
    },
    setMode(next) {
      if (next !== "FULL" && next !== "CRITICAL_ONLY" && next !== "OFF") {
        throw new IntegrationError("INVALID_STATE", "Modalità vocale non valida.");
      }
      mode = next;
    },
    pause() {
      paused = true;
      clearCaption();
    },
    resume() {
      paused = false;
    },
    stop() {
      clearCaption();
      if (machine.status !== "idle") machine.set("idle");
    },
    onSpeakingChange(listener) {
      return speakingListeners.add(listener);
    },
    speak(text, priority, context): SpeakResult {
      const caption = text.trim();
      if (!caption) return { spoken: false, reason: "EMPTY" };
      if (!isErrorSeverity(priority)) {
        throw new IntegrationError("INVALID_STATE", "Priorità vocale non valida.");
      }
      if (paused) return { spoken: false, reason: "PAUSED" };
      if (mode === "OFF" || (mode === "CRITICAL_ONLY" && priority !== "CRITICAL")) {
        return { spoken: false, reason: "MODE" };
      }

      const errorCode = context?.errorCode;
      if (errorCode && !isMovementErrorCode(errorCode)) {
        throw new IntegrationError("INVALID_STATE", "Codice errore sconosciuto.");
      }
      if (errorCode && priority !== "CRITICAL") {
        const key = `${context?.setKey ?? "default"}:${errorCode}`;
        const used = counts.get(key) ?? 0;
        if (used >= voiceDedupeLimit) return { spoken: false, reason: "DEDUPED" };
        counts.set(key, used + 1);
      }

      if (machine.status !== "running") machine.set("running");
      speakingListeners.emit({ speaking: true, text: caption });
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(clearCaption, captionMs);
      return { spoken: true };
    },
  };
}
