import type { MovementError, StoredMovementError } from "@/lib/integrations/movement";
import { toStoredMovementError } from "@/lib/integrations/movement";
import type { VoiceMode } from "@/lib/integrations/types";
import { isIgnoredError, type VoicedMark } from "@/lib/training/ignored";

export type TrainingMode = "free" | "assigned";
export type AnalysisMode = "guided" | "manual";
export type CameraPermission = "unknown" | "granted" | "denied";

export type TrainingPhase =
  | "explanation"
  | "execution"
  | "parameters"
  | "consent"
  | "camera"
  | "countdown"
  | "set"
  | "recovery"
  | "summary"
  | "abandoned";

export type CompletedSet = {
  setNumber: number;
  repsDone: number;
  formScore: number | null;
  trackingLost: boolean;
  errors: StoredMovementError[];
};

export type TrainingState = {
  phase: TrainingPhase;
  mode: TrainingMode;
  analysis: AnalysisMode;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  hasConsent: boolean;
  camera: CameraPermission;
  feedbackMode: VoiceMode;
  setNumber: number;
  repsDone: number;
  scoreSum: number;
  scoreCount: number;
  trackingLost: boolean;
  trackingNow: boolean;
  errors: StoredMovementError[];
  voiced: VoicedMark[];
  completedSets: CompletedSet[];
};

export type TrainingAction =
  | { type: "NEXT" }
  | { type: "ACCEPT_CONSENT" }
  | { type: "CAMERA_GRANTED" }
  | { type: "CAMERA_DENIED" }
  | { type: "START_COUNTDOWN" }
  | { type: "COUNTDOWN_FINISHED" }
  | { type: "REP"; count: number }
  | { type: "MANUAL_REP" }
  | { type: "FORM_SCORE"; score: number }
  | { type: "FORM_ERROR"; error: MovementError; spoken: boolean; deduped: boolean }
  | { type: "TRACKING_LOST" }
  | { type: "TRACKING_RECOVERED" }
  | { type: "FINISH_SET" }
  | { type: "REST_FINISHED" }
  | { type: "CANCEL" }
  | { type: "SET_FEEDBACK_MODE"; mode: VoiceMode };

const feedbackModes: readonly VoiceMode[] = ["FULL", "CRITICAL_ONLY", "OFF"];

export function initialTrainingState(input: {
  mode: TrainingMode;
  analysis: AnalysisMode;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  hasConsent: boolean;
  feedbackMode: VoiceMode;
}): TrainingState {
  return {
    phase: "explanation",
    mode: input.mode,
    analysis: input.analysis,
    targetSets: input.targetSets,
    targetReps: input.targetReps,
    restSeconds: input.restSeconds,
    hasConsent: input.hasConsent,
    camera: "unknown",
    feedbackMode: input.feedbackMode,
    setNumber: 1,
    repsDone: 0,
    scoreSum: 0,
    scoreCount: 0,
    trackingLost: false,
    trackingNow: false,
    errors: [],
    voiced: [],
    completedSets: [],
  };
}

export function shouldJoinLive(mode: TrainingMode, phase: TrainingPhase) {
  return mode === "assigned" && phase === "set";
}

export function readyToFinish(state: TrainingState) {
  return state.phase === "set" && state.repsDone >= state.targetReps;
}

export function trainingReducer(state: TrainingState, action: TrainingAction): TrainingState {
  switch (action.type) {
    case "NEXT":
      if (state.phase === "explanation") return { ...state, phase: "execution" };
      if (state.phase === "execution") return { ...state, phase: "parameters" };
      if (state.phase === "parameters") {
        return { ...state, phase: state.hasConsent ? "camera" : "consent" };
      }
      return state;
    case "ACCEPT_CONSENT":
      if (state.phase !== "consent") return state;
      return { ...state, phase: "camera", hasConsent: true };
    case "CAMERA_GRANTED":
      if (state.phase !== "camera") return state;
      return { ...state, camera: "granted" };
    case "CAMERA_DENIED":
      if (state.phase !== "camera") return state;
      return { ...state, camera: "denied" };
    case "START_COUNTDOWN":
      if (state.phase !== "camera" || state.camera !== "granted" || !state.hasConsent) return state;
      return { ...state, phase: "countdown" };
    case "COUNTDOWN_FINISHED":
      if (state.phase !== "countdown") return state;
      return { ...state, phase: "set", ...emptyDraft() };
    case "REP":
      if (state.phase !== "set" || state.analysis !== "guided" || state.trackingNow) return state;
      if (!Number.isInteger(action.count) || action.count <= state.repsDone) return state;
      return { ...state, repsDone: action.count };
    case "MANUAL_REP":
      if (state.phase !== "set" || state.analysis !== "manual") return state;
      return { ...state, repsDone: state.repsDone + 1 };
    case "FORM_SCORE":
      if (state.phase !== "set" || state.analysis !== "guided") return state;
      if (action.score < 0 || action.score > 100) return state;
      return { ...state, scoreSum: state.scoreSum + action.score, scoreCount: state.scoreCount + 1 };
    case "FORM_ERROR":
      if (state.phase !== "set" || state.analysis !== "guided") return state;
      return recordError(state, action);
    case "TRACKING_LOST":
      if (state.phase !== "set" || state.analysis !== "guided") return state;
      return { ...state, trackingLost: true, trackingNow: true };
    case "TRACKING_RECOVERED":
      if (state.phase !== "set" || state.analysis !== "guided") return state;
      return { ...state, trackingNow: false };
    case "FINISH_SET":
      if (state.phase !== "set") return state;
      return finishSet(state);
    case "REST_FINISHED":
      if (state.phase !== "recovery") return state;
      return { ...state, phase: "countdown", setNumber: state.setNumber + 1 };
    case "CANCEL":
      if (state.phase !== "countdown" && state.phase !== "set" && state.phase !== "recovery") return state;
      return { ...state, phase: "abandoned" };
    case "SET_FEEDBACK_MODE":
      if (!feedbackModes.includes(action.mode)) return state;
      return { ...state, feedbackMode: action.mode };
    default:
      return state;
  }
}

function emptyDraft() {
  return {
    repsDone: 0,
    scoreSum: 0,
    scoreCount: 0,
    trackingLost: false,
    trackingNow: false,
    errors: [],
    voiced: [],
  };
}

function finishSet(state: TrainingState): TrainingState {
  const completed: CompletedSet = {
    setNumber: state.setNumber,
    repsDone: state.repsDone,
    formScore: state.scoreCount > 0 ? state.scoreSum / state.scoreCount : null,
    trackingLost: state.trackingLost,
    errors: state.errors,
  };
  const completedSets = [...state.completedSets, completed];
  const done = state.setNumber >= state.targetSets;
  return { ...state, completedSets, phase: done ? "summary" : "recovery" };
}

function recordError(
  state: TrainingState,
  action: Extract<TrainingAction, { type: "FORM_ERROR" }>,
): TrainingState {
  const ignored = isIgnoredError({
    code: action.error.code,
    severity: action.error.severity,
    repNumber: action.error.repNumber,
    voiced: state.voiced,
    deduped: action.deduped,
  });
  return {
    ...state,
    errors: [...state.errors, toStoredMovementError(action.error, ignored)],
    voiced: action.spoken ? [...state.voiced, { code: action.error.code, rep: action.error.repNumber }] : state.voiced,
  };
}

export function averageFormScore(sets: readonly CompletedSet[]) {
  const scores = sets.flatMap((set) => (set.formScore === null ? [] : [set.formScore]));
  if (scores.length === 0) return null;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function errorsByCode(sets: readonly CompletedSet[]) {
  const grouped = new Map<string, { code: StoredMovementError["code"]; count: number; ignored: number }>();
  for (const set of sets) {
    for (const error of set.errors) {
      const current = grouped.get(error.code) ?? { code: error.code, count: 0, ignored: 0 };
      current.count += 1;
      if (error.ignored) current.ignored += 1;
      grouped.set(error.code, current);
    }
  }
  return [...grouped.values()];
}
