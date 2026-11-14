"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { TileVideo } from "@/components/lobby/live-grid";
import { useCoachLive } from "@/components/lobby/use-coach-live";
import { getIntegrations, movementCue } from "@/lib/integrations";

export function LiveSession({ sessionId }: { sessionId: string }) {
  const live = useCoachLive({ sessionId });
  const peer = live.peers[0] ?? null;
  const frame = peer ? live.data[peer.id] : undefined;
  const errors = peer ? live.recent.filter((item) => item.participantId === peer.id).slice(0, 3) : [];
  const [talking, setTalking] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const talkingRef = useRef(false);
  const localRef = useRef<MediaStream | null>(null);
  const holding = useRef(false);
  const suppressClick = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function startTalk() {
    if (!peer || talkingRef.current) return;
    talkingRef.current = true;
    setTalking(true);
    await fetch("/api/live/speaking", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: peer.sessionId, speaking: true }),
    }).catch(() => undefined);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localRef.current = stream;
      await getIntegrations().room.publishLocalStream(stream);
      setMicNote(null);
    } catch {
      setMicNote("Il microfono non è disponibile. Il cliente sa comunque che stai parlando.");
    }
  }

  function toggleTalk() {
    if (talkingRef.current) void stopTalk();
    else void startTalk();
  }

  async function stopTalk() {
    if (!talkingRef.current) return;
    talkingRef.current = false;
    setTalking(false);
    const stream = localRef.current;
    localRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
    if (peer) {
      await fetch("/api/live/speaking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: peer.sessionId, speaking: false }),
        keepalive: true,
      }).catch(() => undefined);
    }
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">{peer?.displayName ?? "Diretta"}</h1>
        <Link href="/lobby/live" className="min-h-11 text-base font-bold text-muted">
          Torna alle dirette
        </Link>
      </div>
      <p className="text-base text-muted">Uscire da questa schermata non interrompe l'allenamento del cliente.</p>
      {live.notice ? (
        <p className="rounded-2xl border border-line bg-panel px-4 py-3 font-bold" role="alert">
          {live.notice}
        </p>
      ) : null}
      {live.phase === "loading" ? <p role="status">Caricamento delle dirette</p> : null}
      {live.phase === "empty" || live.phase === "denied" ? (
        <p role="status">{live.notice ?? "Nessun cliente in diretta"}</p>
      ) : null}
      {live.phase === "error" ? (
        <div role="alert">
          <p>Le dirette non sono disponibili.</p>
          <button type="button" className="mt-4 min-h-12 rounded-2xl bg-accent px-4 font-extrabold text-white" onClick={live.retry}>
            Riprova
          </button>
        </div>
      ) : null}
      {live.phase === "ready" && peer ? (
        <>
          <TileVideo stream={live.streams[peer.id] ?? null} size="hero" muted={live.audibleId !== peer.id} />
          {live.connection !== "connected" ? (
            <p role="status" className="font-bold">
              Riconnessione
            </p>
          ) : null}
          <dl className="grid grid-cols-2 gap-3" aria-live="polite">
            <Stat label="Stato" value={frame ? (frame.phase === "recovery" ? "Recupero" : "Serie") : "In attesa"} />
            <Stat label="Ripetizioni" value={frame ? String(frame.repCount) : "—"} />
            <Stat label="Punteggio" value={frame?.formScore === null || frame?.formScore === undefined ? "—" : String(Math.round(frame.formScore))} />
            <Stat label="Audio" value={live.audibleId === peer.id ? "Audio attivo" : "Audio spento"} />
          </dl>
          <div>
            <h2 className="text-lg font-extrabold">Errori recenti</h2>
            {errors.length === 0 ? (
              <p className="mt-2 text-muted">Nessun errore recente.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {errors.map((error) => (
                  <li key={`${error.rep}-${error.code}`} className="rounded-2xl border border-line bg-panel px-4 py-3">
                    {movementCue(error.code)} <span className="text-muted">ripetizione {error.rep}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="font-bold">{talking ? "Microfono attivo" : "Microfono spento"}</p>
          {micNote ? <p className="text-sm font-semibold">{micNote}</p> : null}
          <button
            type="button"
            className="min-h-14 rounded-2xl bg-accent px-4 text-lg font-extrabold text-white"
            aria-pressed={talking}
            onPointerDown={(event) => {
              if (event.pointerType === "mouse" && event.button !== 0) return;
              holding.current = false;
              if (holdTimer.current) clearTimeout(holdTimer.current);
              holdTimer.current = setTimeout(() => {
                holding.current = true;
                void startTalk();
              }, 250);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerUp={() => {
              if (holdTimer.current) clearTimeout(holdTimer.current);
              if (!holding.current) return;
              holding.current = false;
              suppressClick.current = true;
              void stopTalk();
            }}
            onPointerCancel={() => {
              if (holdTimer.current) clearTimeout(holdTimer.current);
              if (!holding.current) return;
              holding.current = false;
              void stopTalk();
            }}
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              toggleTalk();
            }}
            onKeyDown={(event) => {
              if (event.repeat) return;
              if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                toggleTalk();
              }
            }}
          >
            {talking ? "Smetti di parlare" : "Parla con il cliente"}
          </button>
          <p className="text-sm text-muted">
            Tocca per parlare o per smettere. Con il mouse puoi tenere premuto. Con la tastiera usa la barra spaziatrice. Mentre parli, la voce dell&apos;analisi si ferma.
          </p>
          <button
            type="button"
            className="min-h-11 self-start rounded-xl border border-line px-3 text-sm font-bold"
            aria-pressed={live.audibleId === peer.id}
            onClick={() => live.chooseAudio(peer.id)}
          >
            {live.audibleId === peer.id ? `Silenzia ${peer.displayName}` : `Attiva audio di ${peer.displayName}`}
          </button>
        </>
      ) : null}
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
