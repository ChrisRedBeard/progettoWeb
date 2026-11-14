"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const button = "flex min-h-14 w-full items-center justify-center rounded-2xl bg-accent px-4 text-lg font-extrabold text-white disabled:opacity-50";

export function AthleteSettings({
  hasCoach,
  coachName,
  privateLive,
}: {
  hasCoach: boolean;
  coachName: string | null;
  privateLive: boolean;
}) {
  const router = useRouter();
  const [live, setLive] = useState(privateLive);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setLive(next);
    const response = await fetch("/api/me/privacy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ privateLive: next }),
    });
    if (!response.ok) {
      setLive(!next);
      setError("Non riesco a salvare la privacy.");
    }
  }

  async function leave() {
    const response = await fetch("/api/me/coach/leave", { method: "POST" });
    if (!response.ok) {
      setError("Non riesco a lasciare il coach.");
      return;
    }
    router.refresh();
  }

  if (!hasCoach) {
    return <p className="mt-4 text-lg text-muted">Ti alleni senza coach. Un invito ti fa entrare in una lobby.</p>;
  }

  return (
    <div className="mt-6 flex max-w-lg flex-col gap-4">
      <label className="flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-line bg-panel px-4 text-lg font-semibold">
        Diretta privata
        <input type="checkbox" checked={live} onChange={(event) => void toggle(event.target.checked)} />
      </label>
      <p className="text-base text-muted">Se è attiva, {coachName ?? "il coach"} riceve l&apos;avviso ma non resta in diretta.</p>
      {confirmLeave ? (
        <div className="rounded-2xl border border-line bg-panel p-4">
          <p className="text-lg leading-7">
            Le sessioni restano tue. {coachName ?? "Il coach"} non le vedrà più e la scheda assegnata si chiude.
          </p>
          <button type="button" className={`${button} mt-4`} onClick={() => void leave()}>
            Confermo
          </button>
        </div>
      ) : (
        <button type="button" className="min-h-14 rounded-2xl border border-line text-lg font-bold" onClick={() => setConfirmLeave(true)}>
          Lascia il coach
        </button>
      )}
      {error ? <p className="text-base font-semibold">{error}</p> : null}
    </div>
  );
}
