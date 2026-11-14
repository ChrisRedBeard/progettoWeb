"use client";

import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { VideoPlayer } from "@/components/training/video-player";
import { CONSENT_VERSION } from "@/lib/consent";
import { getIntegrations, movementCue, type ConnectionState, type VoiceMode } from "@/lib/integrations";
import { requestLiveToken } from "@/lib/live/client";
import { applyCoachSpeech, coachPresencePollMs, coachWatchLabel, tokenRenewDelayMs } from "@/lib/live/contract";
import { createWorkoutSession, postJson } from "@/lib/training/client";
import type { TrainingExercise } from "@/lib/training/exercise";
import {
  averageFormScore,
  errorsByCode,
  initialTrainingState,
  readyToFinish,
  shouldJoinLive,
  trainingReducer,
  type CompletedSet,
  type TrainingAction,
  type TrainingMode,
} from "@/lib/training/flow";
import { createMemoryOutbox, flushOutbox, openOutbox, type OutboxJob, type OutboxStore } from "@/lib/training/outbox";
import type { SetResultBody } from "@/lib/validators/training";

const modeLabels: Record<VoiceMode, string> = {
  FULL: "Tutto",
  CRITICAL_ONLY: "Solo critici",
  OFF: "Spento",
};

const primaryClass =
  "flex min-h-14 w-full items-center justify-center rounded-2xl bg-accent px-4 text-lg font-extrabold text-white disabled:opacity-50";
const quietClass = "min-h-12 w-full text-base font-bold text-muted";

export function TrainingFlow({
  mode,
  exercise,
  feedbackMode,
  hasConsent,
  assignmentId,
  workoutExerciseId,
  exitHref,
  videos,
}: {
  mode: TrainingMode;
  exercise: TrainingExercise;
  feedbackMode: VoiceMode;
  hasConsent: boolean;
  assignmentId: string | null;
  workoutExerciseId: string | null;
  exitHref: string;
  videos?: { explanation: string | null; execution: string | null };
}) {
  const [state, dispatch] = useStateMachine(exercise, mode, feedbackMode, hasConsent);
  const stateRef = useRef(state);
  const sessionIdRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const storeRef = useRef<OutboxStore>(createMemoryOutbox());
  const savedSets = useRef(new Set<number>());
  const abandoned = useRef(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [starting, setStarting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [countLeft, setCountLeft] = useState(3);
  const [restLeft, setRestLeft] = useState(exercise.restSeconds);
  const [elapsed, setElapsed] = useState(0);
  const [pending, setPending] = useState(0);
  const [liveConnection, setLiveConnection] = useState<ConnectionState | null>(null);
  const [liveNotice, setLiveNotice] = useState<string | null>(null);
  const [coachLabel, setCoachLabel] = useState<string | null>(null);
  const privacyOn = useRef(false);

  const apply = useCallback((action: TrainingAction) => {
    const next = trainingReducer(stateRef.current, action);
    stateRef.current = next;
    dispatch(action);
    return next;
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const active = state.phase === "countdown" || state.phase === "set" || state.phase === "recovery";
    if (!active || !sessionId) return;
    let stopped = false;
    async function beat() {
      if (stopped) return;
      const ok = await postJson(`/api/sessions/${sessionId}/heartbeat`, { exerciseId: exercise.id });
      if (!ok) stopped = true;
    }
    void beat();
    const timer = window.setInterval(() => void beat(), 20_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [exercise.id, sessionId, state.phase]);

  useEffect(() => {
    let active = true;
    const send = (job: OutboxJob) => deliver(job);
    void (async () => {
      const durable = await openOutbox();
      if (!active) return;
      const queued = await storeRef.current.list();
      for (const job of queued) await durable.put(job);
      storeRef.current = durable;
      const left = await flushOutbox(durable, send);
      if (active) setPending(left.length);
    })();
    function onOnline() {
      void flushOutbox(storeRef.current, send).then((left) => {
        if (active) setPending(left.length);
      });
    }
    window.addEventListener("online", onOnline);
    return () => {
      active = false;
      window.removeEventListener("online", onOnline);
    };
  }, []);

  useEffect(() => {
    return () => {
      const phase = stateRef.current.phase;
      const id = sessionIdRef.current;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (id && (phase === "countdown" || phase === "set" || phase === "recovery")) {
        void markAbandoned(id);
      }
    };
  }, []);

  useEffect(() => {
    if (state.phase !== "camera" || !state.hasConsent) return;
    let active = true;
    async function openCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        apply({ type: "CAMERA_DENIED" });
        return;
      }
      try {
        const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (!active) {
          next.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = next;
        setStream(next);
        apply({ type: "CAMERA_GRANTED" });
      } catch {
        if (active) apply({ type: "CAMERA_DENIED" });
      }
    }
    void openCamera();
    return () => {
      active = false;
    };
  }, [apply, cameraAttempt, state.hasConsent, state.phase]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, [stream, state.phase]);

  useEffect(() => {
    if (state.phase !== "countdown") return;
    let left = 3;
    setCountLeft(3);
    const id = window.setInterval(() => {
      left -= 1;
      setCountLeft(left);
      if (left <= 0) {
        window.clearInterval(id);
        apply({ type: "COUNTDOWN_FINISHED" });
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [apply, state.phase, state.setNumber]);

  useEffect(() => {
    if (state.phase !== "recovery") return;
    setRestLeft(state.restSeconds);
    const id = window.setInterval(() => {
      setRestLeft((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.phase, state.restSeconds, state.setNumber]);

  useEffect(() => {
    if (state.phase !== "set" || state.analysis !== "manual") return;
    setElapsed(0);
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [state.analysis, state.phase, state.setNumber]);

  useEffect(() => {
    if (state.phase !== "set") return;
    let sentinel: { release: () => Promise<void> } | null = null;
    let stopped = false;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    async function acquire() {
      if (!nav.wakeLock || stopped) return;
      try {
        sentinel = await nav.wakeLock.request("screen");
      } catch {
        sentinel = null;
      }
    }
    void acquire();
    function onVisible() {
      if (document.visibilityState === "visible") void acquire();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => undefined);
    };
  }, [state.phase, state.setNumber]);

  useEffect(() => {
    if (state.phase !== "set" || state.analysis !== "guided") return;
    const video = videoRef.current;
    if (!video) return;
    const { pose, voice } = getIntegrations();
    voice.setMode(stateRef.current.feedbackMode);
    try {
      pose.start(video, exercise.analysisKey ?? exercise.id, {
        onRep: (count) => {
          apply({ type: "REP", count });
          queueMicrotask(() => {
            if (readyToFinish(stateRef.current)) closeSet();
          });
        },
        onError: (error) => {
          const result = voice.speak(movementCue(error.code), error.severity, {
            errorCode: error.code,
            setKey: `${sessionIdRef.current ?? "session"}:${stateRef.current.setNumber}`,
          });
          apply({
            type: "FORM_ERROR",
            error,
            spoken: result.spoken,
            deduped: !result.spoken && result.reason === "DEDUPED",
          });
        },
        onTrackingLost: () => apply({ type: "TRACKING_LOST" }),
        onTrackingRecovered: () => apply({ type: "TRACKING_RECOVERED" }),
        onFormScore: (score) => apply({ type: "FORM_SCORE", score }),
      });
    } catch {
      setNotice("L'analisi non è partita. Puoi chiudere la serie quando vuoi.");
    }
    const stopSpeaking = voice.onSpeakingChange((speaking) => setCaption(speaking.text));
    return () => {
      stopSpeaking();
      pose.stop();
      setCaption(null);
    };
  }, [apply, exercise.analysisKey, exercise.id, state.analysis, state.phase, state.setNumber]);

  useEffect(() => {
    if (!shouldJoinLive(mode, state.phase) || !sessionId || !stream) return;
    const { room, voice, events } = getIntegrations();
    let cancelled = false;
    let startedEvents = false;
    const stops: Array<() => void> = [];

    void (async () => {
      try {
        if (cancelled) return;
        if (events.status !== "running") {
          events.start();
          startedEvents = true;
        }
        if (cancelled) {
          if (startedEvents) events.stop();
          return;
        }
        const issued = await requestLiveToken({ sessionId });
        if (cancelled) return;
        if (!issued.ok) {
          setLiveNotice(issued.kind === "denied" ? issued.error : "La diretta non è disponibile. L'allenamento continua.");
          return;
        }
        await room.join(issued.ticket);
        if (cancelled) {
          await room.leave();
          return;
        }
        await room.publishLocalStream(stream);
        stops.push(
          room.onRemoteSpeaking(({ speaking }) => {
            applyCoachSpeech(voice, speaking);
          }),
        );
        stops.push(
          room.onConnectionChange((connection) => {
            if (!cancelled) setLiveConnection(connection);
          }),
        );
        stops.push(
          room.onForcedDisconnect(() => {
            if (!cancelled) setLiveNotice("La diretta si è chiusa. L'allenamento continua.");
          }),
        );
        stops.push(room.subscribe(() => undefined, () => undefined));
        if (!cancelled) setLiveConnection("connected");
        const renew = (expiresAt: string) => {
          const wait = tokenRenewDelayMs(expiresAt);
          window.setTimeout(async () => {
            if (cancelled || room.status !== "running") return;
            const next = await requestLiveToken({ sessionId });
            if (cancelled || !next.ok || room.status !== "running") return;
            try {
              await room.refreshToken(next.ticket);
              renew(next.ticket.expiresAt);
            } catch {
              if (!cancelled) setLiveNotice("La diretta si è chiusa. L'allenamento continua.");
            }
          }, wait);
        };
        renew(issued.ticket.expiresAt);
      } catch {
        if (!cancelled) setLiveConnection("disconnected");
      }
    })();

    return () => {
      cancelled = true;
      for (const stop of stops) stop();
      void room.leave().catch(() => undefined);
      if (startedEvents) events.stop();
      applyCoachSpeech(voice, false);
    };
  }, [mode, sessionId, state.phase, stream]);

  useEffect(() => {
    if (mode !== "assigned" || !sessionId) return;
    const watched = state.phase === "countdown" || state.phase === "set" || state.phase === "recovery" || state.phase === "summary";
    if (!watched) return;
    let cancelled = false;
    async function poll() {
      const response = await fetch(`/api/live/presence?sessionId=${encodeURIComponent(sessionId ?? "")}`);
      if (!response.ok || cancelled) return;
      const body = (await response.json()) as { watching?: boolean; coachName?: string | null; speaking?: boolean };
      if (cancelled) return;
      setCoachLabel(body.watching && body.coachName && !privacyOn.current ? coachWatchLabel(body.coachName) : null);
      applyCoachSpeech(getIntegrations().voice, body.speaking === true);
    }
    void poll();
    const timer = setInterval(() => void poll(), coachPresencePollMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
      applyCoachSpeech(getIntegrations().voice, false);
    };
  }, [mode, sessionId, state.phase]);

  useEffect(() => {
    if (mode !== "assigned" || (state.phase !== "set" && state.phase !== "recovery")) return;
    const room = getIntegrations().room;
    if (room.status !== "running") return;
    const last = state.errors[state.errors.length - 1];
    const score = state.scoreCount > 0 ? Math.max(0, Math.min(100, Math.round(state.scoreSum / state.scoreCount))) : null;
    try {
      room.publishData({
        repCount: state.repsDone,
        formScore: score,
        error: last ? { code: last.code, severity: last.severity } : null,
        phase: state.phase,
      });
    } catch {
      // La stanza può chiudersi mentre la serie continua.
    }
  }, [mode, state.errors, state.phase, state.repsDone, state.scoreCount, state.scoreSum]);

  async function enablePrivacy() {
    privacyOn.current = true;
    setCoachLabel(null);
    const ok = await postJson("/api/me/privacy", { privateLive: true });
    if (!ok) {
      privacyOn.current = false;
      setNotice("Non riesco ad attivare la privacy. Riprova.");
      return;
    }
    setLiveNotice("La diretta del coach è chiusa.");
    void getIntegrations().room.leave().catch(() => undefined);
  }

  async function refreshPending() {
    const left = await storeRef.current.list();
    setPending(left.length);
  }

  async function persistSet(set: CompletedSet, complete: boolean) {
    const id = sessionIdRef.current;
    if (!id || savedSets.current.has(set.setNumber)) return;
    savedSets.current.add(set.setNumber);
    const body: SetResultBody = {
      exerciseId: exercise.id,
      workoutExerciseId,
      setNumber: set.setNumber,
      repsDone: set.repsDone,
      formScore: set.formScore,
      errors: set.errors,
      trackingLost: set.trackingLost,
      complete,
    };
    const ok = await postJson(`/api/sessions/${id}/sets`, body);
    if (!ok) {
      await storeRef.current.put({ id: crypto.randomUUID(), kind: "set", sessionId: id, body, createdAt: Date.now() });
    }
    await refreshPending();
  }

  function closeSet() {
    if (stateRef.current.phase !== "set") return;
    const next = apply({ type: "FINISH_SET" });
    const completed = next.completedSets.at(-1);
    if (completed) void persistSet(completed, next.phase === "summary");
  }

  async function markAbandoned(id: string) {
    if (abandoned.current) return;
    abandoned.current = true;
    const ok = await postJson(`/api/sessions/${id}/abandon`);
    if (!ok) {
      await storeRef.current.put({ id: crypto.randomUUID(), kind: "abandon", sessionId: id, createdAt: Date.now() });
      await refreshPending();
    }
  }

  function cancelWorkout() {
    const id = sessionIdRef.current;
    apply({ type: "CANCEL" });
    if (id) void markAbandoned(id);
  }

  async function acceptConsent() {
    setStarting(true);
    setNotice(null);
    const ok = await postJson("/api/me/consent", { version: CONSENT_VERSION });
    setStarting(false);
    if (!ok) {
      setNotice("Non riesco a registrare il consenso. Riprova.");
      return;
    }
    apply({ type: "ACCEPT_CONSENT" });
  }

  async function begin() {
    if (state.phase !== "camera" || state.camera !== "granted" || starting) return;
    setStarting(true);
    setNotice(null);
    const id = await createWorkoutSession({
      exerciseId: exercise.id,
      mode,
      assignmentId,
      workoutExerciseId,
    });
    setStarting(false);
    if (!id) {
      setNotice("Non riesco ad aprire la sessione. Controlla la connessione e riprova.");
      return;
    }
    sessionIdRef.current = id;
    setSessionId(id);
    apply({ type: "START_COUNTDOWN" });
  }

  function chooseMode(next: VoiceMode) {
    apply({ type: "SET_FEEDBACK_MODE", mode: next });
    getIntegrations().voice.setMode(next);
    void (async () => {
      const ok = await postJson("/api/me/feedback", { mode: next, sessionId: sessionIdRef.current });
      if (!ok) {
        await storeRef.current.put({
          id: crypto.randomUUID(),
          kind: "feedback",
          mode: next,
          sessionId: sessionIdRef.current,
          createdAt: Date.now(),
        });
        await refreshPending();
      }
    })();
  }

  function addRep() {
    const next = apply({ type: "MANUAL_REP" });
    if (readyToFinish(next)) closeSet();
  }

  const sync = (
    <SyncNote pending={pending} live={liveConnection} message={liveNotice} />
  );

  if (state.phase === "explanation" || state.phase === "execution") {
    const execution = state.phase === "execution";
    return (
      <Stage
        title={exercise.title}
        action={<button type="button" className={primaryClass} onClick={() => apply({ type: "NEXT" })}>Continua</button>}
      >
        <VideoPlayer title={execution ? "Esecuzione" : "Spiegazione"} videoId={execution ? videos?.execution : videos?.explanation} />
        {exercise.description ? <p className="text-lg leading-7 text-muted">{exercise.description}</p> : null}
        <ExitLink href={exitHref} />
        {sync}
      </Stage>
    );
  }

  if (state.phase === "parameters") {
    return (
      <Stage
        title="Parametri"
        action={<button type="button" className={primaryClass} onClick={() => apply({ type: "NEXT" })}>Continua</button>}
      >
        <dl className="grid grid-cols-2 gap-3 text-lg">
          <Stat label="Serie" value={String(exercise.sets)} />
          <Stat label={exercise.countLabel} value={String(exercise.reps)} />
          <Stat label="Recupero" value={`${exercise.restSeconds} s`} />
          <Stat label="Tempo" value={exercise.tempo ?? "Libero"} />
        </dl>
        {exercise.analysisType === "NONE" ? (
          <p className="rounded-2xl border border-line bg-panel p-4 text-lg font-semibold">
            Questo esercizio non è analizzato. Userai camera, timer e conteggio manuale.
          </p>
        ) : null}
        <ExitLink href={exitHref} />
        {sync}
      </Stage>
    );
  }

  if (state.phase === "consent") {
    return (
      <Stage
        title="Consenso"
        action={
          <button type="button" className={primaryClass} disabled={starting} onClick={() => void acceptConsent()}>
            Accetto
          </button>
        }
      >
        <p className="text-lg leading-7">
          Per allenarti la camera resta accesa sul telefono. Il video non viene salvato: teniamo solo il conteggio e gli errori di esecuzione.
        </p>
        <p className="text-base text-muted">Versione del consenso: {CONSENT_VERSION}</p>
        {notice ? <p className="text-base font-semibold">{notice}</p> : null}
        <ExitLink href={exitHref} />
        {sync}
      </Stage>
    );
  }

  if (state.phase === "camera" && state.camera !== "granted") {
    const denied = state.camera === "denied";
    return (
      <Stage
        title="Camera"
        action={
          <button
            type="button"
            className={primaryClass}
            disabled={!denied}
            onClick={() => setCameraAttempt((value) => value + 1)}
          >
            {denied ? "Riprova" : "In attesa della camera"}
          </button>
        }
      >
        <p className="text-lg leading-7">
          {denied
            ? "Il browser ha negato la camera. Per riattivarla tocca l'icona del lucchetto nella barra dell'indirizzo, apri le autorizzazioni del sito e consenti la fotocamera. Poi premi Riprova."
            : "Sto chiedendo il permesso per usare la camera. Il conto alla rovescia non parte finché non è concesso."}
        </p>
        {exercise.analysisType === "NONE" ? <ManualNote /> : null}
        {sync}
      </Stage>
    );
  }

  if (state.phase === "camera") {
    return (
      <CameraFrame videoRef={videoRef} guide>
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 p-4">
          <p className="text-center text-lg font-bold text-white drop-shadow">
            Inquadra tutto il corpo, dalla testa ai piedi. La luce deve arrivarti da davanti.
          </p>
          {exercise.analysisType === "NONE" ? <ManualNote light /> : null}
          {notice ? <p className="text-center text-base font-semibold text-white">{notice}</p> : null}
          <button type="button" className={primaryClass} disabled={starting} onClick={() => void begin()}>
            Inizia
          </button>
        </div>
        {sync}
      </CameraFrame>
    );
  }

  const coachBanner = coachLabel ? (
    <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 bg-accent px-3 py-2 text-white" role="status">
      <p className="text-sm font-extrabold">{coachLabel}</p>
      <button type="button" className="min-h-11 shrink-0 rounded-xl bg-white px-3 text-sm font-extrabold text-black" onClick={() => void enablePrivacy()}>
        Attiva privacy
      </button>
    </div>
  ) : null;

  if (state.phase === "countdown") {
    return (
      <CameraFrame videoRef={videoRef}>
        {coachBanner}
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-[clamp(6rem,30vw,10rem)] font-black text-white drop-shadow">
          {countLeft}
        </p>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <button type="button" className={`${quietClass} text-white`} onClick={cancelWorkout}>
            Annulla
          </button>
        </div>
        {sync}
      </CameraFrame>
    );
  }

  if (state.phase === "set") {
    const manual = state.analysis === "manual";
    return (
      <CameraFrame videoRef={videoRef}>
        {coachBanner}
        <p
          className={`pointer-events-none absolute left-3 z-10 text-[clamp(6.5rem,36vw,9rem)] font-black leading-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] landscape:text-[clamp(5rem,34vh,8rem)] ${coachLabel ? "top-16" : "top-3"}`}
          aria-live="polite"
        >
          {state.repsDone}
        </p>
        <p className="pointer-events-none absolute left-3 top-[clamp(7.2rem,40vw,10.5rem)] z-10 text-sm font-bold uppercase tracking-wide text-white landscape:top-[clamp(5.5rem,38vh,9rem)]">
          {exercise.countLabel} · serie {state.setNumber}/{exercise.sets}
        </p>
        {state.trackingNow ? (
          <p className="absolute left-3 top-40 z-10 rounded-full bg-black/70 px-3 py-1 text-sm font-bold text-white">
            Fuori inquadratura
          </p>
        ) : null}
        <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
          {manual ? (
            <p className="max-w-[11rem] rounded-2xl bg-black/70 px-3 py-2 text-sm font-bold leading-5 text-white">
              Non analizzato · {elapsed}s
            </p>
          ) : null}
          <button type="button" className={`min-h-12 rounded-xl bg-black/70 px-4 text-base font-bold text-white ${coachLabel ? "mt-12" : ""}`} onClick={cancelWorkout}>
            Esci
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 landscape:flex-row landscape:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="min-h-16 text-center text-3xl font-extrabold leading-tight text-white landscape:text-left landscape:text-2xl" aria-live="assertive">
              {caption ?? (manual ? "Conta tu. L'esercizio non è analizzato." : "")}
            </p>
            {notice ? <p className="text-sm font-semibold text-white">{notice}</p> : null}
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Feedback vocale">
              {(Object.keys(modeLabels) as VoiceMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={state.feedbackMode === item}
                  onClick={() => chooseMode(item)}
                  className={`min-h-12 rounded-xl px-2 text-sm font-bold ${state.feedbackMode === item ? "bg-white text-black" : "bg-white/20 text-white"}`}
                >
                  {modeLabels[item]}
                </button>
              ))}
            </div>
          </div>
          {manual ? (
            <div className="flex w-full flex-col landscape:w-56">
              <button type="button" className={primaryClass} onClick={addRep}>
                +1
              </button>
              <button type="button" className={`${quietClass} text-white`} onClick={closeSet}>
                Chiudi serie
              </button>
            </div>
          ) : (
            <button type="button" className={`${primaryClass} landscape:w-56`} onClick={closeSet}>
              Termina serie
            </button>
          )}
        </div>
        {sync}
      </CameraFrame>
    );
  }

  if (state.phase === "recovery") {
    return (
      <Stage
        title="Recupero"
        action={
          <div className="flex flex-col">
            <button type="button" className={primaryClass} onClick={() => apply({ type: "REST_FINISHED" })}>
              Continua
            </button>
            <button type="button" className={quietClass} onClick={cancelWorkout}>
              Interrompi allenamento
            </button>
          </div>
        }
      >
        {coachBanner}
        <p className="text-[clamp(4rem,20vw,6rem)] font-black leading-none">{restLeft}</p>
        <p className="text-lg text-muted">Secondi di recupero consigliati. Puoi passare alla serie successiva quando vuoi.</p>
        {sync}
      </Stage>
    );
  }

  if (state.phase === "abandoned") {
    return (
      <Stage title="Allenamento interrotto" action={<Link href={exitHref} className={primaryClass}>Torna indietro</Link>}>
        <p className="text-lg leading-7">La sessione è stata chiusa. Le serie già concluse restano nello storico.</p>
        {sync}
      </Stage>
    );
  }

  const score = averageFormScore(state.completedSets);
  const grouped = errorsByCode(state.completedSets);
  const ignored = state.completedSets.reduce(
    (sum, set) => sum + set.errors.filter((error) => error.ignored).length,
    0,
  );

  return (
    <Stage title="Riepilogo" action={<Link href={exitHref} className={primaryClass}>Torna indietro</Link>}>
      {coachBanner}
      <p className="text-lg">
        Punteggio medio:{" "}
        <strong>{score === null ? "senza analisi" : Math.round(score)}</strong>
      </p>
      {grouped.length === 0 ? (
        <p className="text-lg text-muted">Nessun errore registrato.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {grouped.map((item) => (
            <li key={item.code} className="rounded-2xl border border-line bg-panel px-4 py-3 text-lg">
              {movementCue(item.code)} <span className="text-muted">×{item.count}</span>
              {item.count >= 2 ? <span className="mt-1 block text-base text-muted">Ricorrente</span> : null}
            </li>
          ))}
        </ul>
      )}
      <p className="text-lg">Errori ignorati: <strong>{ignored}</strong></p>
      {sync}
    </Stage>
  );
}

function useStateMachine(
  exercise: TrainingExercise,
  mode: TrainingMode,
  feedbackMode: VoiceMode,
  hasConsent: boolean,
) {
  return useReducer(
    trainingReducer,
    undefined,
    () =>
      initialTrainingState({
        mode,
        analysis: exercise.analysisType === "NONE" ? "manual" : "guided",
        targetSets: exercise.sets,
        targetReps: exercise.reps,
        restSeconds: exercise.restSeconds,
        hasConsent,
        feedbackMode,
      }),
  );
}

function Stage({ title, children, action }: { title: string; children: React.ReactNode; action: React.ReactNode }) {
  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-5">
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      <div className="mt-4 flex flex-1 flex-col gap-4">{children}</div>
      <div className="sticky bottom-0 mt-6 bg-canvas pb-2 pt-3">{action}</div>
    </section>
  );
}

function CameraFrame({
  videoRef,
  guide = false,
  children,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  guide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="relative min-h-dvh bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: "scaleX(-1)" }}
      />
      {guide ? <div className="pointer-events-none absolute inset-6 rounded-[2rem] border-2 border-white/80" /> : null}
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <dt className="text-sm font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-extrabold">{value}</dd>
    </div>
  );
}

function ExitLink({ href }: { href: string }) {
  return (
    <Link href={href} className="text-base font-bold text-muted">
      Esci
    </Link>
  );
}

function ManualNote({ light = false }: { light?: boolean }) {
  return (
    <p className={`rounded-2xl px-4 py-3 text-base font-semibold ${light ? "bg-black/60 text-white" : "border border-line bg-panel"}`}>
      Questo esercizio non è analizzato.
    </p>
  );
}

function SyncNote({
  pending,
  live,
  message,
}: {
  pending: number;
  live: ConnectionState | null;
  message: string | null;
}) {
  const waiting = pending > 0;
  const unstable = live === "disconnected" || live === "reconnecting";
  if (!waiting && !unstable && !message) return null;
  const text = waiting ? "Sincronizzazione in sospeso" : unstable ? "Connessione instabile" : message;
  return (
    <p className="pointer-events-none fixed bottom-2 right-2 z-20 rounded-full bg-panel/90 px-3 py-1 text-xs font-semibold text-muted">
      {text}
    </p>
  );
}

async function deliver(job: OutboxJob) {
  if (job.kind === "set") return postJson(`/api/sessions/${job.sessionId}/sets`, job.body);
  if (job.kind === "abandon") return postJson(`/api/sessions/${job.sessionId}/abandon`);
  return postJson("/api/me/feedback", { mode: job.mode, sessionId: job.sessionId });
}
