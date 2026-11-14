import { describe, expect, it } from "vitest";
import { createVoiceFeedback } from "@/lib/integrations/mock/voice-feedback";
import { demoLiveScript, parseLiveData, publishIsAllowed } from "@/lib/integrations/live-data";
import { movementErrorSeverity } from "@/lib/integrations/movement";
import {
  applyCoachSpeech,
  coachExitForLobbyEvent,
  coachPresenceTtlMs,
  liveTokenRenewBeforeMs,
  liveTokenTtlMs,
  tokenRenewDelayMs,
  coachWatchLabel,
  liveTileLimit,
  pageTiles,
} from "@/lib/live/contract";
import { endWatchesForSessions, readWatch, rememberCoachWatch, resetWatches, setWatchSpeaking } from "@/lib/live/watch";

describe("live grid policy", () => {
  it("pages at most six tiles", () => {
    const items = Array.from({ length: 7 }, (_, index) => index + 1);
    const first = pageTiles(items, 0, liveTileLimit);
    const second = pageTiles(items, 1, liveTileLimit);
    expect(first.tiles).toEqual([1, 2, 3, 4, 5, 6]);
    expect(first.pages).toBe(2);
    expect(second.tiles).toEqual([7]);
    expect(pageTiles(items, 9).page).toBe(1);
  });

  it("pauses the analysis voice while the coach is speaking", () => {
    const voice = createVoiceFeedback();
    expect(voice.speak("Continua", "WARN").spoken).toBe(true);
    applyCoachSpeech(voice, true);
    expect(voice.paused).toBe(true);
    expect(voice.speak("Ancora", "CRITICAL")).toEqual({ spoken: false, reason: "PAUSED" });
    applyCoachSpeech(voice, false);
    expect(voice.speak("Riprendi", "INFO").spoken).toBe(true);
  });

  it("disconnects the coach when privacy turns on", () => {
    expect(coachExitForLobbyEvent({ type: "privacyChanged", privateLive: true })).toBe("PRIVACY_ENABLED");
    expect(coachExitForLobbyEvent({ type: "privacyChanged", privateLive: false })).toBeNull();
    expect(coachExitForLobbyEvent({ type: "sessionEnded" })).toBe("ATHLETE_LEFT");
  });

  it("names the coach the athlete can see", () => {
    expect(coachWatchLabel("Martina Greco")).toBe("Martina ti sta guardando");
  });

  it("keeps the demo data on the same error codes as the fake analysis", () => {
    for (const frame of demoLiveScript) {
      expect(parseLiveData(frame).ok).toBe(true);
      if (frame.error) expect(frame.error.severity).toBe(movementErrorSeverity[frame.error.code]);
    }
    expect(demoLiveScript.at(-1)?.phase).toBe("recovery");
    expect(publishIsAllowed({ audio: true, video: false }, { audio: 1, video: 1 })).toBe(false);
    expect(publishIsAllowed({ audio: true, video: false }, { audio: 1, video: 0 })).toBe(true);
  });

  it("renews a 90 second token before it expires", () => {
    const now = 1_000_000;
    const expiresAt = new Date(now + liveTokenTtlMs).toISOString();
    const delay = tokenRenewDelayMs(expiresAt, now);
    expect(delay).toBe(liveTokenTtlMs - liveTokenRenewBeforeMs);
    expect(now + delay).toBeLessThan(now + liveTokenTtlMs);
  });

  it("expires a coach watch and drops it when privacy clears the session", () => {
    resetWatches();
    rememberCoachWatch({ sessionId: "s1", coachUserId: "coach", coachName: "Martina Greco", now: 1_000, ttlMs: 90_000 });
    expect(setWatchSpeaking("coach", "s1", true, 1_000)).toBe(true);
    rememberCoachWatch({ sessionId: "s1", coachUserId: "coach", coachName: "Martina Greco", now: 2_000, ttlMs: 90_000 });
    expect(readWatch("s1", 2_000)?.speaking).toBe(true);
    expect(readWatch("s1", 2_000 + 90_000)).toBeNull();
    rememberCoachWatch({ sessionId: "s1", coachUserId: "coach", coachName: "Martina Greco", now: 3_000 });
    expect(readWatch("s1", 3_000 + coachPresenceTtlMs - 1)?.coachName).toBe("Martina Greco");
    expect(readWatch("s1", 3_000 + coachPresenceTtlMs)).toBeNull();
    endWatchesForSessions(["s1"]);
    expect(readWatch("s1", 3_000)).toBeNull();
    resetWatches();
  });
});
