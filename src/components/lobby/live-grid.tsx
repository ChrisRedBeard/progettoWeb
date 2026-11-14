"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCoachLive } from "@/components/lobby/use-coach-live";
import { getMockDebug } from "@/lib/integrations";

export function LiveGrid() {
  const live = useCoachLive({ scope: "lobby" });

  return (
    <section className="mx-auto max-w-6xl" aria-labelledby="live-grid-title">
      <h1 id="live-grid-title" className="text-3xl font-extrabold tracking-tight">
        Dirette
      </h1>
      <p className="mt-3 text-lg text-muted">Una connessione, una tile per ogni cliente in diretta. Il microfono è spento.</p>
      <p className="mt-2 text-base font-bold">Microfono spento</p>
      {process.env.NODE_ENV === "development" ? (
        <button
          type="button"
          className="mt-3 min-h-11 rounded-xl border border-line px-3 text-sm font-bold"
          onClick={() => {
            try {
              getMockDebug()?.dropConnection();
            } catch {
              // La stanza non è aperta.
            }
          }}
        >
          Connessione caduta
        </button>
      ) : null}
      {live.notice ? (
        <p className="mt-4 rounded-2xl border border-line bg-panel px-4 py-3 text-base font-bold" role="alert">
          {live.notice}
        </p>
      ) : null}
      {live.phase === "loading" ? (
        <p className="mt-8 text-lg" role="status">
          Caricamento delle dirette
        </p>
      ) : null}
      {live.phase === "empty" ? (
        <p className="mt-8 text-lg" role="status">
          Nessun cliente in diretta
        </p>
      ) : null}
      {live.phase === "error" ? (
        <div className="mt-8" role="alert">
          <p className="text-lg">Le dirette non sono disponibili.</p>
          <button type="button" className="mt-4 min-h-12 rounded-2xl bg-accent px-4 font-extrabold text-white" onClick={live.retry}>
            Riprova
          </button>
        </div>
      ) : null}
      {live.phase === "denied" ? (
        <div className="mt-8" role="alert">
          <p className="text-lg">{live.notice ?? "Non puoi entrare in questa diretta."}</p>
          <button type="button" className="mt-4 min-h-12 rounded-2xl bg-accent px-4 font-extrabold text-white" onClick={live.retry}>
            Riprova
          </button>
        </div>
      ) : null}
      {live.phase === "ready" ? (
        <>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {live.visible.map((peer) => {
              const focused = peer.id === live.focusedId;
              const audible = peer.id === live.audibleId;
              const frame = live.data[peer.id];
              return (
                <li key={peer.sessionId}>
                  <article
                    className={`flex h-full flex-col gap-3 rounded-2xl border bg-panel p-3 ${focused ? "border-accent" : "border-line"}`}
                    aria-label={peer.displayName}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-xl font-extrabold">{peer.displayName}</h2>
                      <p className="text-sm font-bold">{focused ? "Qualità alta" : "Qualità bassa"}</p>
                    </div>
                    <TileVideo stream={live.streams[peer.id] ?? null} size={focused ? "focus" : "thumb"} muted={!audible} />
                    {live.connection !== "connected" ? (
                      <p role="status" className="text-sm font-bold">
                        Riconnessione
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-muted">
                        {frame ? (frame.phase === "recovery" ? "Recupero" : `Serie · ${frame.repCount} ripetizioni`) : "In attesa dei dati"}
                      </p>
                    )}
                    <p className="text-sm font-bold">{audible ? "Audio attivo" : "Audio spento"}</p>
                    <div className="mt-auto flex flex-col gap-2">
                      <button
                        type="button"
                        className="min-h-11 rounded-xl border border-line px-3 text-left text-sm font-bold"
                        onClick={() => live.setFocusedId(peer.id)}
                      >
                        Metti {peer.displayName} in primo piano
                      </button>
                      <button
                        type="button"
                        className="min-h-11 rounded-xl border border-line px-3 text-left text-sm font-bold"
                        aria-pressed={audible}
                        onClick={() => live.chooseAudio(peer.id)}
                      >
                        {audible ? `Silenzia ${peer.displayName}` : `Attiva audio di ${peer.displayName}`}
                      </button>
                      <Link href={`/lobby/live/${peer.sessionId}`} className="inline-flex min-h-11 items-center text-sm font-bold text-accent">
                        Apri la diretta di {peer.displayName}
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
          {live.pages > 1 ? (
            <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Pagine delle dirette">
              <button
                type="button"
                className="min-h-11 rounded-xl border border-line px-3 font-bold disabled:opacity-40"
                disabled={live.page === 0}
                onClick={() => live.setPage(live.page - 1)}
              >
                Pagina precedente
              </button>
              <p className="text-sm font-bold">
                Pagina {live.page + 1} di {live.pages}
              </p>
              <button
                type="button"
                className="min-h-11 rounded-xl border border-line px-3 font-bold disabled:opacity-40"
                disabled={live.page >= live.pages - 1}
                onClick={() => live.setPage(live.page + 1)}
              >
                Pagina successiva
              </button>
            </nav>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export function TileVideo({
  stream,
  size = "thumb",
  muted = true,
}: {
  stream: MediaStream | null;
  size?: "thumb" | "focus" | "hero";
  muted?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.srcObject = stream;
    return () => {
      video.srcObject = null;
    };
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={`w-full rounded-xl bg-black object-cover ${size === "hero" ? "aspect-video max-h-[50dvh]" : size === "focus" ? "h-52 landscape:h-36" : "h-28 landscape:h-20"}`}
    />
  );
}
