"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LobbyEvent } from "@/lib/lobby/events";
import { lobbyRefreshMs } from "@/lib/lobby/presence";
import type { RosterAthlete } from "@/lib/lobby/service";

export function LobbyBoard({ initial }: { initial: RosterAthlete[] }) {
  const [athletes, setAthletes] = useState(initial);
  const [banner, setBanner] = useState<string | null>(null);
  const [sound, setSound] = useState(false);

  useEffect(() => {
    setAthletes(initial);
  }, [initial]);

  useEffect(() => {
    const source = new EventSource("/api/lobby/events");
    source.addEventListener("open", () => {
      setBanner(null);
      void reload();
    });
    source.addEventListener("live", (message) => {
      const event = parseEvent(message);
      if (!event) return;
      if (event.type === "sessionStarted" && event.live) {
        setBanner(`${event.athleteName} è in diretta`);
        if (sound) playChime();
      } else if (event.type === "privacyChanged" && event.privateLive) {
        setBanner(`${event.athleteName} ha reso privata la diretta`);
      } else if (event.type === "sessionEnded") {
        setBanner(null);
      }
      void reload();
    });
    return () => source.close();
  }, [sound]);

  useEffect(() => {
    const timer = setInterval(() => {
      void reload();
    }, lobbyRefreshMs);
    return () => clearInterval(timer);
  }, []);

  async function reload() {
    const response = await fetch("/api/lobby/clients");
    if (!response.ok) return;
    const body = (await response.json()) as { athletes?: RosterAthlete[] };
    if (body.athletes) setAthletes(body.athletes);
  }

  return (
    <div>
      <label className="mt-4 flex min-h-12 items-center gap-3 text-base font-semibold">
        <input type="checkbox" checked={sound} onChange={(event) => setSound(event.target.checked)} />
        Suono quando un cliente va in diretta
      </label>
      {banner ? (
        <p className="mt-4 rounded-2xl border border-accent bg-panel px-4 py-3 text-lg font-extrabold text-accent">{banner}</p>
      ) : null}
      <ul className="mt-6 grid gap-3">
        {athletes.length === 0 ? <li className="text-lg text-muted">Nessun atleta in lobby.</li> : null}
        {athletes.map((athlete) => (
          <li key={athlete.id}>
            <Link href={`/clients/${athlete.id}`} className="block rounded-2xl border border-line bg-panel p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold">{athlete.name}</h2>
                <span className="rounded-full bg-canvas px-3 py-1 text-sm font-bold">
                  {athlete.training ? "In allenamento" : "Offline"}
                </span>
                {athlete.live ? <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-white">In diretta</span> : null}
              </div>
              <p className="mt-2 text-base text-muted">
                {athlete.training && athlete.currentExercise
                  ? `Esercizio in corso: ${athlete.currentExercise}`
                  : athlete.lastTrainingAt
                    ? `Ultimo allenamento: ${formatWhen(athlete.lastTrainingAt)}`
                    : "Nessun allenamento"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function parseEvent(message: Event) {
  if (!(message instanceof MessageEvent) || typeof message.data !== "string") return null;
  try {
    return JSON.parse(message.data) as LobbyEvent;
  } catch {
    return null;
  }
}

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function playChime() {
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  gain.gain.value = 0.05;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.18);
  oscillator.onended = () => void context.close();
}
