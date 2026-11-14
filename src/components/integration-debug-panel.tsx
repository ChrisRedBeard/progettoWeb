"use client";

import { useMemo, useRef, useState } from "react";
import {
  IntegrationError,
  getIntegrations,
  getMockDebug,
  isMovementErrorCode,
  movementCue,
  movementErrorCodes,
  movementErrorSeverity,
  type MovementErrorCode,
} from "@/lib/integrations";

type LogLine = { id: number; text: string };

export function IntegrationDebugPanel() {
  const bundle = useMemo(() => getIntegrations(), []);
  const debug = useMemo(() => getMockDebug(), []);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const armed = useRef(false);
  const lineId = useRef(0);
  const [log, setLog] = useState<LogLine[]>([]);
  const [caption, setCaption] = useState<string | null>(null);
  const [code, setCode] = useState<MovementErrorCode>("knees_in");
  const [coachSpeaking, setCoachSpeaking] = useState(false);
  const [trackingLost, setTrackingLost] = useState(false);
  const [privateLive, setPrivateLive] = useState(false);
  const [statuses, setStatuses] = useState({
    pose: bundle.pose.status,
    voice: bundle.voice.status,
    room: bundle.room.status,
    events: bundle.events.status,
  });

  function push(text: string) {
    lineId.current += 1;
    const id = lineId.current;
    setLog((current) => [{ id, text }, ...current].slice(0, 12));
  }

  function fail(error: unknown) {
    if (error instanceof IntegrationError) {
      push(`${error.code}: ${error.message}`);
      return;
    }
    push("Errore imprevisto.");
  }

  async function notifyLobby(body: { type: "sessionStarted" | "sessionEnded" | "privacyChanged"; privateLive?: boolean }) {
    try {
      const response = await fetch("/api/dev/lobby-notice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      push(response.ok ? "Avviso inviato alla lobby." : "La lobby non ha ricevuto l'avviso.");
    } catch {
      push("La lobby non ha ricevuto l'avviso.");
    }
  }

  function watchStatus() {
    const update = () =>
      setStatuses({
        pose: bundle.pose.status,
        voice: bundle.voice.status,
        room: bundle.room.status,
        events: bundle.events.status,
      });
    bundle.pose.onStatusChange(update);
    bundle.voice.onStatusChange(update);
    bundle.room.onStatusChange(update);
    bundle.events.onStatusChange(update);
  }

  async function arm() {
    if (!debug || armed.current) return;
    armed.current = true;
    watchStatus();
    try {
      bundle.pose.start(cameraRef.current, "squat", {
        onRep: (count) => push(`Ripetizione ${count}`),
        onError: (error) => push(`Errore movimento ${error.code} (${error.severity})`),
        onTrackingLost: () => push("Tracking perso"),
        onTrackingRecovered: () => push("Tracking recuperato"),
        onFormScore: (score) => push(`Punteggio ${score}`),
      });
      bundle.events.start();
      bundle.events.subscribe((event) => {
        if (event.type === "privacyChanged") push(`Privacy ${event.privateLive ? "attiva" : "disattiva"}`);
        else push(event.type === "sessionStarted" ? "Diretta iniziata" : "Diretta terminata");
      });
      bundle.voice.onSpeakingChange((state) => setCaption(state.speaking ? state.text : null));
      bundle.room.onRemoteSpeaking((event) => {
        if (event.speaking) bundle.voice.pause();
        else bundle.voice.resume();
        push(event.speaking ? "Il coach parla: voce AI in pausa." : "Il coach ha smesso: voce AI ripresa.");
      });
      bundle.room.onForcedDisconnect((reason) => push(`Disconnessione forzata: ${reason}`));
      bundle.room.onConnectionChange((state) => push(`Connessione ${state}`));
      bundle.room.subscribe(
        (participant, presence) => push(`${participant.displayName} ${presence === "joined" ? "entrato" : "uscito"}`),
        (_id, stream) => {
          const preview = previewRef.current;
          if (preview && stream) {
            preview.srcObject = stream;
            void preview.play().catch(() => undefined);
          }
        },
      );
      const token = await bundle.room.getToken("athlete", "debug-session");
      await bundle.room.join(token);
      push("Mock avviati.");
    } catch (error) {
      armed.current = false;
      fail(error);
    }
  }

  if (process.env.NODE_ENV === "production" || !debug) {
    return <p className="text-lg">Il pannello di debug è disponibile solo in sviluppo, con le integrazioni mock.</p>;
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-accent">Solo sviluppo</p>
        <h1 className="mt-2 text-3xl font-extrabold">Pannello integrazioni</h1>
        <p className="mt-2 text-base text-muted">Forza gli eventi che in produzione arriveranno da camera, voce e diretta.</p>
      </header>
      <p className="text-sm text-muted">
        Pose {statuses.pose} · Voce {statuses.voice} · Diretta {statuses.room} · Eventi {statuses.events}
      </p>
      <p aria-live="assertive" className="min-h-16 rounded-2xl border border-line bg-panel px-4 py-3 text-2xl font-bold">
        {caption ?? "Nessun sottotitolo"}
      </p>
      <video ref={previewRef} className="h-40 w-full rounded-2xl bg-black object-cover" muted playsInline autoPlay />
      <video ref={cameraRef} className="hidden" muted playsInline />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="min-h-12 rounded-xl bg-accent px-4 font-bold text-white" onClick={() => void arm()}>
          Avvia mock
        </button>
        <label className="flex min-h-12 items-center gap-2 rounded-xl border border-line px-3">
          Errore
          <select
            className="bg-transparent"
            value={code}
            onChange={(event) => {
              if (isMovementErrorCode(event.target.value)) setCode(event.target.value);
            }}
          >
            {movementErrorCodes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="min-h-12 rounded-xl border border-line px-4 font-semibold"
          onClick={() => {
            const severity = movementErrorSeverity[code];
            try {
              debug.emitError({ code, severity });
              const result = bundle.voice.speak(movementCue(code), severity, { errorCode: code, setKey: "debug-set" });
              push(result.spoken ? "Voce attivata" : `Voce non attivata: ${result.reason}`);
            } catch (error) {
              fail(error);
            }
          }}
        >
          Errore di movimento
        </button>
        <button
          type="button"
          className="min-h-12 rounded-xl border border-line px-4 font-semibold"
          onClick={() => {
            try {
              if (trackingLost) {
                debug.emitTrackingRecovered();
                setTrackingLost(false);
              } else {
                debug.emitTrackingLost();
                setTrackingLost(true);
              }
            } catch (error) {
              fail(error);
            }
          }}
        >
          {trackingLost ? "Tracking recuperato" : "Tracking perso"}
        </button>
        <button
          type="button"
          className="min-h-12 rounded-xl border border-line px-4 font-semibold"
          onClick={() => {
            try {
              debug.setCoachSpeaking(!coachSpeaking);
              setCoachSpeaking((current) => !current);
            } catch (error) {
              fail(error);
            }
          }}
        >
          {coachSpeaking ? "Il coach smette" : "Il coach parla"}
        </button>
        <button
          type="button"
          className="min-h-12 rounded-xl border border-line px-4 font-semibold"
          onClick={() => {
            const next = !privateLive;
            setPrivateLive(next);
            void notifyLobby({ type: "privacyChanged", privateLive: next });
            try {
              debug.emitPrivacyChanged(next);
              if (next && bundle.room.status === "running") debug.forceDisconnect("PRIVACY_ENABLED");
            } catch (error) {
              fail(error);
            }
          }}
        >
          {privateLive ? "Togli privacy" : "Attiva privacy"}
        </button>
        <button
          type="button"
          className="min-h-12 rounded-xl border border-line px-4 font-semibold"
          onClick={() => {
            try {
              debug.dropConnection();
            } catch (error) {
              fail(error);
            }
          }}
        >
          Connessione caduta
        </button>
        <button
          type="button"
          className="min-h-12 rounded-xl border border-line px-4 font-semibold"
          onClick={() => {
            void notifyLobby({ type: "sessionStarted" });
            try {
              debug.emitSessionStarted();
            } catch (error) {
              fail(error);
            }
          }}
        >
          Cliente in diretta
        </button>
        <button
          type="button"
          className="min-h-12 rounded-xl border border-line px-4 font-semibold"
          onClick={() => {
            void notifyLobby({ type: "sessionEnded" });
            try {
              debug.emitSessionEnded();
            } catch (error) {
              fail(error);
            }
          }}
        >
          Diretta terminata
        </button>
      </div>
      <ol className="space-y-2 text-sm">
        {log.map((line) => (
          <li key={line.id} className="rounded-xl border border-line px-3 py-2">
            {line.text}
          </li>
        ))}
      </ol>
    </section>
  );
}
