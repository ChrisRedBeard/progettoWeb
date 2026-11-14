"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Created = { token: string; expiresAt: string };

const button = "flex min-h-14 items-center justify-center rounded-2xl bg-accent px-4 text-lg font-extrabold text-white disabled:opacity-50";

export function InviteCreator() {
  const router = useRouter();
  const [days, setDays] = useState<1 | 7 | 30>(7);
  const [email, setEmail] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);

  async function createInvite() {
    setPending(true);
    setError(null);
    setCopied(false);
    const response = await fetch("/api/invites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ days, email }),
    });
    setPending(false);
    if (!response.ok) {
      setError("Non riesco a creare l'invito.");
      return;
    }
    const body = (await response.json()) as { token?: string; expiresAt?: string };
    if (!body.token || !body.expiresAt) {
      setError("Non riesco a creare l'invito.");
      return;
    }
    setCreated({ token: body.token, expiresAt: body.expiresAt });
    router.refresh();
  }

  const link = created && typeof window !== "undefined" ? `${window.location.origin}/invite/${created.token}` : "";

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="text-xl font-extrabold">Nuovo invito</h2>
      <label className="mt-4 block text-base font-semibold">
        Scadenza
        <select
          className="mt-2 w-full rounded-xl border border-line bg-canvas px-4 py-3 text-lg"
          value={days}
          onChange={(event) => setDays(Number(event.target.value) as 1 | 7 | 30)}
        >
          <option value={1}>1 giorno</option>
          <option value={7}>7 giorni</option>
          <option value={30}>30 giorni</option>
        </select>
      </label>
      <label className="mt-4 block text-base font-semibold">
        Email, se vuoi limitarlo
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-xl border border-line bg-canvas px-4 py-3 text-lg"
          placeholder="opzionale"
        />
      </label>
      <button type="button" className={`${button} mt-4 w-full`} disabled={pending} onClick={() => void createInvite()}>
        Crea invito
      </button>
      {error ? <p className="mt-3 text-base font-semibold">{error}</p> : null}
      {created ? (
        <div className="mt-4 rounded-2xl border border-line bg-canvas p-4">
          <p className="text-base font-semibold">Il link si vede solo adesso. Non viene salvato in chiaro.</p>
          <p className="mt-2 break-all text-sm">{link}</p>
          <button
            type="button"
            className={`${button} mt-3 w-full`}
            onClick={() => {
              void navigator.clipboard.writeText(link).then(() => setCopied(true));
            }}
          >
            {copied ? "Copiato" : "Copia link"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
