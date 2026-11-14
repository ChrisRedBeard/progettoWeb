import { describe, expect, it } from "vitest";
import type { MovementError } from "@/lib/integrations/movement";
import { initialTrainingState, readyToFinish, shouldJoinLive, trainingReducer, type TrainingState } from "@/lib/training/flow";

function start(partial?: Partial<Parameters<typeof initialTrainingState>[0]>) {
  return initialTrainingState({
    mode: "free",
    analysis: "guided",
    targetSets: 2,
    targetReps: 3,
    restSeconds: 60,
    hasConsent: false,
    feedbackMode: "FULL",
    ...partial,
  });
}

function apply(state: TrainingState, ...actions: Parameters<typeof trainingReducer>[1][]) {
  return actions.reduce(trainingReducer, state);
}

function at(state: TrainingState, phase: TrainingState["phase"]) {
  return { ...state, phase };
}

const knees: MovementError = { code: "knees_in", severity: "WARN", repNumber: 2 };
const back: MovementError = { code: "back_rounded", severity: "CRITICAL", repNumber: 2 };

describe("training flow", () => {
  it("walks explanation, execution, parameters and consent", () => {
    const state = apply(start(), { type: "NEXT" }, { type: "NEXT" }, { type: "NEXT" });
    expect(state.phase).toBe("consent");
    expect(trainingReducer(state, { type: "ACCEPT_CONSENT" }).phase).toBe("camera");
  });

  it("skips consent when it was already given", () => {
    const state = apply(start({ hasConsent: true }), { type: "NEXT" }, { type: "NEXT" }, { type: "NEXT" });
    expect(state.phase).toBe("camera");
    expect(state.hasConsent).toBe(true);
  });

  it("does not open the countdown when the camera is denied", () => {
    const camera = at(start({ hasConsent: true }), "camera");
    const denied = trainingReducer(camera, { type: "CAMERA_DENIED" });
    expect(denied.camera).toBe("denied");
    expect(trainingReducer(denied, { type: "START_COUNTDOWN" })).toBe(denied);
  });

  it("does not open the countdown without consent or before the grant", () => {
    const waiting = at(start(), "camera");
    expect(trainingReducer(waiting, { type: "START_COUNTDOWN" })).toBe(waiting);
    const grantedWithoutConsent = trainingReducer(waiting, { type: "CAMERA_GRANTED" });
    expect(trainingReducer(grantedWithoutConsent, { type: "START_COUNTDOWN" })).toBe(grantedWithoutConsent);
  });

  it("starts the countdown only after consent and a granted camera", () => {
    const ready = trainingReducer(at(start({ hasConsent: true }), "camera"), { type: "CAMERA_GRANTED" });
    const countdown = trainingReducer(ready, { type: "START_COUNTDOWN" });
    expect(countdown.phase).toBe("countdown");
    expect(trainingReducer(countdown, { type: "COUNTDOWN_FINISHED" }).phase).toBe("set");
  });

  it("records a lost frame during the set and ignores reps until tracking returns", () => {
    const set = at(start(), "set");
    const lost = trainingReducer(set, { type: "TRACKING_LOST" });
    expect(lost.trackingLost).toBe(true);
    expect(lost.trackingNow).toBe(true);
    expect(trainingReducer(lost, { type: "REP", count: 1 })).toBe(lost);
    const back = trainingReducer(lost, { type: "TRACKING_RECOVERED" });
    expect(back.trackingNow).toBe(false);
    expect(back.trackingLost).toBe(true);
    expect(trainingReducer(back, { type: "REP", count: 1 }).repsDone).toBe(1);
  });

  it("ignores tracking events outside the set", () => {
    const explanation = start();
    expect(trainingReducer(explanation, { type: "TRACKING_LOST" })).toBe(explanation);
    expect(trainingReducer(explanation, { type: "TRACKING_RECOVERED" })).toBe(explanation);
  });

  it("abandons the workout when leaving during the set", () => {
    const set = at(start(), "set");
    expect(trainingReducer(set, { type: "CANCEL" }).phase).toBe("abandoned");
  });

  it("abandons the workout when recovery is cancelled", () => {
    const recovery = at(start(), "recovery");
    expect(trainingReducer(recovery, { type: "CANCEL" }).phase).toBe("abandoned");
    const early = start();
    expect(trainingReducer(early, { type: "CANCEL" })).toBe(early);
  });

  it("abandons a countdown that is interrupted", () => {
    expect(trainingReducer(at(start(), "countdown"), { type: "CANCEL" }).phase).toBe("abandoned");
  });

  it("keeps the set open until it is closed, then rests or summarizes", () => {
    let set = at(start(), "set");
    set = trainingReducer(set, { type: "REP", count: 3 });
    expect(set.phase).toBe("set");
    expect(readyToFinish(set)).toBe(true);
    const recovery = trainingReducer(set, { type: "FINISH_SET" });
    expect(recovery.phase).toBe("recovery");
    expect(recovery.completedSets[0]?.repsDone).toBe(3);
    const next = trainingReducer(recovery, { type: "REST_FINISHED" });
    expect(next.phase).toBe("countdown");
    expect(next.setNumber).toBe(2);
    const second = trainingReducer(next, { type: "COUNTDOWN_FINISHED" });
    expect(second.repsDone).toBe(0);
    const done = trainingReducer({ ...second, repsDone: 3 }, { type: "FINISH_SET" });
    expect(done.phase).toBe("summary");
    expect(done.completedSets).toHaveLength(2);
  });

  it("counts a manual exercise without analysis events", () => {
    const set = at(start({ analysis: "manual" }), "set");
    expect(trainingReducer(set, { type: "REP", count: 1 })).toBe(set);
    expect(trainingReducer(set, { type: "FORM_ERROR", error: knees, spoken: true, deduped: false })).toBe(set);
    const counted = trainingReducer(set, { type: "MANUAL_REP" });
    expect(counted.repsDone).toBe(1);
    const guided = at(start(), "set");
    expect(trainingReducer(guided, { type: "MANUAL_REP" })).toBe(guided);
  });

  it("marks a repeated cue as ignored and never ignores a critical error", () => {
    let set = at(start(), "set");
    set = trainingReducer(set, { type: "FORM_ERROR", error: knees, spoken: true, deduped: false });
    set = trainingReducer(set, {
      type: "FORM_ERROR",
      error: { ...knees, repNumber: 3 },
      spoken: true,
      deduped: false,
    });
    expect(set.errors.map((error) => error.ignored)).toEqual([false, true]);

    const critical = trainingReducer(at(start(), "set"), {
      type: "FORM_ERROR",
      error: back,
      spoken: false,
      deduped: true,
    });
    expect(critical.errors[0]?.ignored).toBe(false);

    const shelved = trainingReducer(at(start(), "set"), {
      type: "FORM_ERROR",
      error: { ...knees, repNumber: 8 },
      spoken: false,
      deduped: true,
    });
    expect(shelved.errors[0]?.ignored).toBe(true);
    expect(shelved.voiced).toEqual([]);
  });

  it("does not treat an unspoken cue as ignored", () => {
    let set = at(start(), "set");
    set = trainingReducer(set, { type: "FORM_ERROR", error: knees, spoken: false, deduped: false });
    set = trainingReducer(set, {
      type: "FORM_ERROR",
      error: { ...knees, repNumber: 3 },
      spoken: false,
      deduped: false,
    });
    expect(set.errors.every((error) => !error.ignored)).toBe(true);
  });

  it("drops a repeat that falls outside the window and can be voiced again", () => {
    let set = at(start(), "set");
    set = trainingReducer(set, { type: "FORM_ERROR", error: { ...knees, repNumber: 1 }, spoken: true, deduped: false });
    set = trainingReducer(set, {
      type: "FORM_ERROR",
      error: { ...knees, repNumber: 6 },
      spoken: true,
      deduped: false,
    });
    expect(set.errors.map((error) => error.ignored)).toEqual([false, false]);
  });

  it("rejects scores and errors outside the set", () => {
    const camera = at(start(), "camera");
    expect(trainingReducer(camera, { type: "FORM_SCORE", score: 80 })).toBe(camera);
    expect(trainingReducer(camera, { type: "FORM_ERROR", error: knees, spoken: true, deduped: false })).toBe(camera);
    const set = trainingReducer(at(start(), "set"), { type: "FORM_SCORE", score: 80 });
    expect(trainingReducer(set, { type: "FINISH_SET" }).completedSets[0]?.formScore).toBe(80);
    const invalid = at(start(), "set");
    expect(trainingReducer(invalid, { type: "FORM_SCORE", score: 120 })).toBe(invalid);
  });

  it("changes feedback mode during the set", () => {
    const set = at(start(), "set");
    expect(trainingReducer(set, { type: "SET_FEEDBACK_MODE", mode: "OFF" }).feedbackMode).toBe("OFF");
    expect(trainingReducer(set, { type: "SET_FEEDBACK_MODE", mode: "FULL" }).phase).toBe("set");
  });

  it("joins the live room only for an assigned set", () => {
    expect(shouldJoinLive("assigned", "set")).toBe(true);
    expect(shouldJoinLive("free", "set")).toBe(false);
    expect(shouldJoinLive("assigned", "countdown")).toBe(false);
    expect(shouldJoinLive("assigned", "recovery")).toBe(false);
  });

  it("ignores transitions that do not belong to the current phase", () => {
    const summary = at(start(), "summary");
    expect(trainingReducer(summary, { type: "NEXT" })).toBe(summary);
    expect(trainingReducer(summary, { type: "REST_FINISHED" })).toBe(summary);
    expect(trainingReducer(summary, { type: "FINISH_SET" })).toBe(summary);
    expect(trainingReducer(summary, { type: "COUNTDOWN_FINISHED" })).toBe(summary);
    const parameters = at(start(), "parameters");
    expect(trainingReducer(parameters, { type: "ACCEPT_CONSENT" })).toBe(parameters);
  });
});
