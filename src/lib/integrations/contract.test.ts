import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IntegrationError, createIntegrations, parseStoredMovementErrors, toStoredMovementError, voiceDedupeLimit } from "@/lib/integrations";
import { createMockIntegrations } from "@/lib/integrations/mock/bundle";
import type { MockDebug } from "@/lib/integrations/mock/bundle";
import type { DisconnectReason, LiveEvents, LiveRoomProvider, PoseAnalyzer, PoseCallbacks, VoiceFeedback } from "@/lib/integrations/types";
import { applyCoachSpeech } from "@/lib/live/contract";

type Harness = {
  pose: PoseAnalyzer;
  voice: VoiceFeedback;
  room: LiveRoomProvider;
  events: LiveEvents;
  video: HTMLVideoElement;
  triggers: MockDebug;
  dispose: () => Promise<void>;
};

const implementations: Array<{ name: string; create: () => Harness }> = [
  {
    name: "mock",
    create: () => {
      const bundle = createMockIntegrations({ simulate: false });
      return {
        pose: bundle.pose,
        voice: bundle.voice,
        room: bundle.room,
        events: bundle.events,
        video: document.createElement("video"),
        triggers: bundle.debug,
        async dispose() {
          bundle.pose.stop();
          bundle.voice.stop();
          bundle.events.stop();
          await bundle.room.leave();
        },
      };
    },
  },
];

function callbacks(partial: Partial<PoseCallbacks> = {}): PoseCallbacks {
  return {
    onRep: () => undefined,
    onError: () => undefined,
    onTrackingLost: () => undefined,
    onTrackingRecovered: () => undefined,
    onFormScore: () => undefined,
    ...partial,
  };
}

describe.each(implementations)("integration contract ($name)", ({ create }) => {
  let harness: Harness;

  beforeEach(() => {
    harness = create();
  });

  afterEach(async () => {
    await harness.dispose();
  });

  it("moves the pose analyzer through idle, running and idle", () => {
    const seen: string[] = [];
    harness.pose.onStatusChange((status) => seen.push(status));
    expect(harness.pose.status).toBe("idle");
    harness.pose.start(harness.video, "squat", callbacks());
    expect(harness.pose.status).toBe("running");
    harness.pose.stop();
    expect(harness.pose.status).toBe("idle");
    expect(seen).toEqual(["starting", "running", "idle"]);
  });

  it("rejects a missing camera with IntegrationError", () => {
    let caught: unknown;
    try {
      harness.pose.start(null, "squat", callbacks());
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(IntegrationError);
    expect(caught).toBe(harness.pose.lastError);
    if (caught instanceof IntegrationError) expect(caught.code).toBe("CAMERA_UNAVAILABLE");
    expect(harness.pose.status).toBe("error");
  });

  it("delivers reps, errors, tracking and score through the public callbacks", () => {
    const reps: number[] = [];
    const errors: string[] = [];
    const tracking: string[] = [];
    const scores: number[] = [];
    harness.pose.start(
      harness.video,
      "squat",
      callbacks({
        onRep: (count) => reps.push(count),
        onError: (error) => errors.push(`${error.code}:${error.severity}:${error.repNumber}`),
        onTrackingLost: () => tracking.push("lost"),
        onTrackingRecovered: () => tracking.push("recovered"),
        onFormScore: (score) => scores.push(score),
      }),
    );
    harness.triggers.emitRep();
    harness.triggers.emitError({ code: "knees_in", repNumber: 1 });
    harness.triggers.emitTrackingLost();
    harness.triggers.emitTrackingRecovered();
    harness.triggers.emitFormScore(88);
    expect(reps).toEqual([1]);
    expect(errors).toEqual(["knees_in:WARN:1"]);
    expect(tracking).toEqual(["lost", "recovered"]);
    expect(scores).toEqual([88]);
  });

  it("dedupes the same non-critical error inside a set and always speaks critical ones", () => {
    const spoken: boolean[] = [];
    harness.voice.onSpeakingChange((state) => {
      if (state.speaking) spoken.push(true);
    });
    for (let index = 0; index < voiceDedupeLimit; index += 1) {
      expect(harness.voice.speak("Ginocchia.", "WARN", { errorCode: "knees_in", setKey: "set-1" }).spoken).toBe(true);
    }
    expect(harness.voice.speak("Ginocchia.", "WARN", { errorCode: "knees_in", setKey: "set-1" })).toEqual({
      spoken: false,
      reason: "DEDUPED",
    });
    expect(harness.voice.speak("Schiena.", "CRITICAL", { errorCode: "back_rounded", setKey: "set-1" }).spoken).toBe(true);
    expect(harness.voice.speak("Ginocchia.", "WARN", { errorCode: "knees_in", setKey: "set-2" }).spoken).toBe(true);
    expect(spoken).toHaveLength(voiceDedupeLimit + 2);
  });

  it("honours voice mode, pause and resume", () => {
    harness.voice.setMode("OFF");
    const silenced = harness.voice.speak("Ciao", "WARN");
    expect(silenced.spoken).toBe(false);
    if (!silenced.spoken) expect(silenced.reason).toBe("MODE");
    harness.voice.setMode("CRITICAL_ONLY");
    const warning = harness.voice.speak("Ciao", "WARN");
    expect(warning.spoken).toBe(false);
    if (!warning.spoken) expect(warning.reason).toBe("MODE");
    expect(harness.voice.speak("Fermati", "CRITICAL").spoken).toBe(true);
    harness.voice.setMode("FULL");
    harness.voice.pause();
    expect(harness.voice.paused).toBe(true);
    const paused = harness.voice.speak("Ancora", "WARN");
    expect(paused.spoken).toBe(false);
    if (!paused.spoken) expect(paused.reason).toBe("PAUSED");
    harness.voice.resume();
    expect(harness.voice.speak("Riprendi", "INFO").spoken).toBe(true);
    harness.voice.stop();
    expect(harness.voice.status).toBe("idle");
  });

  it("joins a room with a token and reports forced disconnect and connection loss", async () => {
    const reasons: DisconnectReason[] = [];
    const connections: string[] = [];
    harness.room.onForcedDisconnect((reason) => reasons.push(reason));
    harness.room.onConnectionChange((state) => connections.push(state));
    await expect(harness.room.getToken("athlete", "")).rejects.toBeInstanceOf(IntegrationError);

    const token = await harness.room.getToken("athlete", "session-1");
    await harness.room.join(token);
    expect(harness.room.status).toBe("running");
    expect(connections).toEqual(["connected"]);
    harness.triggers.setCoachSpeaking(true);
    harness.triggers.dropConnection();
    expect(harness.room.status).toBe("error");
    expect(harness.room.lastError?.code).toBe("CONNECTION_LOST");
    expect(connections.at(-1)).toBe("disconnected");

    await harness.room.join(token);
    harness.triggers.forceDisconnect("TOKEN_EXPIRED");
    await expect(harness.room.join(token)).rejects.toMatchObject({ code: "TOKEN_EXPIRED" });
    const fresh = await harness.room.getToken("athlete", "session-1");
    await harness.room.join(fresh);
    harness.triggers.forceDisconnect("PRIVACY_ENABLED");
    expect(harness.room.status).toBe("idle");
    expect(reasons).toEqual(["TOKEN_EXPIRED", "PRIVACY_ENABLED"]);
  });

  it("notifies remote speaking and privacy, and ignores events after unsubscribe", async () => {
    const speech: boolean[] = [];
    const events: string[] = [];
    const token = await harness.room.getToken("athlete", "session-3");
    await harness.room.join(token);
    harness.room.onRemoteSpeaking((event) => speech.push(event.speaking));
    harness.events.start();
    const stop = harness.events.subscribe((event) => events.push(event.type));
    harness.triggers.setCoachSpeaking(true);
    harness.triggers.setCoachSpeaking(false);
    harness.triggers.emitSessionStarted();
    harness.triggers.emitPrivacyChanged(true);
    harness.triggers.emitSessionEnded();
    stop();
    harness.triggers.emitSessionStarted();
    expect(speech).toEqual([true, false]);
    expect(events).toEqual(["sessionStarted", "privacyChanged", "sessionEnded"]);
  });

  it("rejects mute and quality changes for an unknown participant", async () => {
    const token = await harness.room.getToken("coach", "session-4");
    await harness.room.join(token);
    expect(() => harness.room.muteRemote("missing")).toThrow(IntegrationError);
    expect(() => harness.room.setQuality("missing", "low")).toThrow(IntegrationError);
  });

  it("validates live data, pauses when the coach speaks, and announces the coach", async () => {
    const coach = await harness.room.getToken("coach", "session-data");
    const athlete = await harness.room.getToken("athlete", "session-data");
    expect(coach.publish).toEqual({ audio: true, video: false });
    expect(athlete.publish.video).toBe(true);
    await harness.room.join(coach);
    const received: string[] = [];
    const presence: boolean[] = [];
    harness.room.onData((message) => received.push(`${message.data.repCount}:${message.data.phase}`));
    harness.room.onCoachPresence((event) => presence.push(event.present));
    harness.room.publishData({ repCount: 3, formScore: 74, error: { code: "knees_in", severity: "WARN" }, phase: "set" });
    expect(() => harness.room.publishData({ repCount: -1, formScore: 1, error: null, phase: "set" })).toThrow(IntegrationError);
    expect(received).toEqual(["3:set"]);
    harness.voice.pause();
    expect(harness.voice.speak("Ancora", "WARN")).toEqual({ spoken: false, reason: "PAUSED" });
    harness.triggers.setCoachSpeaking(true);
    applyCoachSpeech(harness.voice, true);
    expect(harness.voice.paused).toBe(true);
    harness.triggers.setCoachPresent(true, "Martina");
    harness.triggers.setCoachPresent(false);
    expect(presence).toEqual([true, false]);
  });

  it("refreshes a token without dropping the room, and expires one that is not refreshed", async () => {
    const first = await harness.room.getToken("coach", "session-renew");
    const joined = { ...first, expiresAt: new Date(Date.now() + 400).toISOString() };
    await harness.room.join(joined);
    const replacement = await harness.room.getToken("coach", "session-renew");
    await harness.room.refreshToken({ ...replacement, expiresAt: new Date(Date.now() + 10_000).toISOString() });
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(harness.room.status).toBe("running");

    const expiring = await harness.room.getToken("athlete", "session-expire");
    await harness.room.leave();
    await harness.room.join({ ...expiring, expiresAt: new Date(Date.now() + 50).toISOString() });
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(harness.room.status).toBe("error");
    expect(harness.room.lastError?.code).toBe("TOKEN_EXPIRED");
  });
});

describe("stored movement errors", () => {
  it("keeps the same codes that the analyzer emits", () => {
    const stored = toStoredMovementError({ code: "depth_insufficient", severity: "WARN", repNumber: 4 }, true);
    const parsed = parseStoredMovementErrors([stored]);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.errors).toEqual([{ rep: 4, code: "depth_insufficient", severity: "WARN", ignored: true }]);
    const invalid = parseStoredMovementErrors([{ rep: 1, code: "unknown", severity: "WARN", ignored: false }]);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.error).toBeInstanceOf(IntegrationError);
  });
});

describe("integration switch", () => {
  it("throws a typed error when the real services are selected", () => {
    expect(() => createIntegrations("real")).toThrow(IntegrationError);
  });
});
