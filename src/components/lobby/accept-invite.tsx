"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const button = "flex min-h-14 w-full items-center justify-center rounded-2xl bg-accent px-4 text-lg font-extrabold text-white disabled:opacity-50";

export function AcceptInvite({ token, confirmLeave }: { token: string; confirmLeave: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function accept(leaveCurrent: boolean) {
    setPending(true);
    setError(null);
    const response = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, leaveCurrent }),
    });
    setPending(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { reason?: string } | null;
      setError(body?.reason === "other_coach" ? "Hai già un coach. Conferma il cambio." : "Non riesco ad accettare l'invito.");
      return;
    }
    router.push("/explore");
    router.refresh();
  }

  if (confirmLeave && !confirming) {
    return (
      <button type="button" className={button} onClick={() => setConfirming(true)}>
        Lascia il coach e accetta
      </button>
    );
  }

  if (confirmLeave) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-lg leading-7">
          Le sessioni già fatte restano tue. Il coach attuale non le vedrà più, e la sua scheda non sarà più attiva.
        </p>
        <button type="button" className={button} disabled={pending} onClick={() => void accept(true)}>
          Confermo il cambio
        </button>
        {error ? <p className="text-base font-semibold">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button type="button" className={button} disabled={pending} onClick={() => void accept(false)}>
        Accetta invito
      </button>
      {error ? <p className="text-base font-semibold">{error}</p> : null}
    </div>
  );
}
