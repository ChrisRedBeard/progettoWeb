"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { VideoUpload } from "@/components/library/video-upload";

export type ExerciseDraft = {
  id?: string;
  title: string;
  description: string;
  defaultSets: number;
  defaultReps: number;
  defaultTempo: string;
  defaultRestSeconds: number;
  visibility: "PRIVATE" | "PUBLIC";
  archived: boolean;
  explanationVideoId: string | null;
  executionVideoId: string | null;
};

const fieldClass = "mt-2 w-full rounded-2xl border border-line bg-panel px-4 py-3 text-lg";

export function ExerciseForm({ initial }: { initial?: ExerciseDraft }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sets, setSets] = useState(String(initial?.defaultSets ?? 3));
  const [reps, setReps] = useState(String(initial?.defaultReps ?? 10));
  const [tempo, setTempo] = useState(initial?.defaultTempo ?? "");
  const [rest, setRest] = useState(String(initial?.defaultRestSeconds ?? 60));
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">(initial?.visibility ?? "PRIVATE");
  const [confirmPublic, setConfirmPublic] = useState(initial?.visibility === "PUBLIC");
  const [explanationUploadId, setExplanationUploadId] = useState<string | null>(null);
  const [executionUploadId, setExecutionUploadId] = useState<string | null>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    if (visibility === "PUBLIC" && !confirmPublic) {
      setError("Per renderlo pubblico conferma che sarà visibile a chi non ha un coach.");
      return;
    }
    setSaving(true);
    const response = await fetch(initial?.id ? `/api/exercises/${initial.id}` : "/api/exercises", {
      method: initial?.id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        defaultSets: Number(sets),
        defaultReps: Number(reps),
        defaultTempo: tempo,
        defaultRestSeconds: Number(rest),
        visibility,
        confirmPublic,
        explanationUploadId,
        executionUploadId,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
    setSaving(false);
    if (!response.ok || !body.id) {
      setError(body.error ?? "Salvataggio non riuscito.");
      return;
    }
    router.push(`/exercises/${body.id}`);
    router.refresh();
  }

  async function archive() {
    if (!initial?.id) return;
    if (!window.confirm("L'esercizio esce dalla libreria. Le schede che lo hanno già lo tengono.")) return;
    setSaving(true);
    const response = await fetch(`/api/exercises/${initial.id}/archive`, { method: "POST" });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(body.error ?? "Archiviazione non riuscita.");
      return;
    }
    router.push("/exercises");
    router.refresh();
  }

  return (
    <form
      className="mt-6 grid max-w-2xl gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <p className="rounded-2xl border border-line bg-panel p-4 text-base font-semibold">
        Questo esercizio non ha analisi del movimento. Il cliente lo esegue e conta da solo.
      </p>
      {initial?.archived ? <p className="text-base font-bold">Archiviato. Non si può aggiungere a una scheda nuova.</p> : null}
      <label className="text-base font-bold">
        Titolo
        <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={80} />
      </label>
      <label className="text-base font-bold">
        Descrizione
        <textarea className={fieldClass} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={3} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-base font-bold">
          Serie
          <input className={fieldClass} inputMode="numeric" value={sets} onChange={(event) => setSets(event.target.value)} required />
        </label>
        <label className="text-base font-bold">
          Ripetizioni
          <input className={fieldClass} inputMode="numeric" value={reps} onChange={(event) => setReps(event.target.value)} required />
        </label>
        <label className="text-base font-bold">
          Tempo
          <input className={fieldClass} value={tempo} onChange={(event) => setTempo(event.target.value)} maxLength={20} placeholder="2-0-2" />
        </label>
        <label className="text-base font-bold">
          Recupero (secondi)
          <input className={fieldClass} inputMode="numeric" value={rest} onChange={(event) => setRest(event.target.value)} required />
        </label>
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-base font-bold">Visibilità</legend>
        <label className="flex min-h-12 items-center gap-3 text-lg">
          <input type="radio" name="visibility" checked={visibility === "PRIVATE"} onChange={() => setVisibility("PRIVATE")} />
          Privato
        </label>
        <label className="flex min-h-12 items-center gap-3 text-lg">
          <input type="radio" name="visibility" checked={visibility === "PUBLIC"} onChange={() => setVisibility("PUBLIC")} />
          Pubblico
        </label>
        {visibility === "PUBLIC" ? (
          <label className="flex min-h-12 items-start gap-3 text-base font-semibold">
            <input type="checkbox" className="mt-1" checked={confirmPublic} onChange={(event) => setConfirmPublic(event.target.checked)} />
            Confermo: sarà visibile a chi non ha un coach.
          </label>
        ) : null}
      </fieldset>
      <VideoUpload
        label="Spiegazione"
        existingId={initial?.explanationVideoId ?? null}
        onUploaded={setExplanationUploadId}
        onBusy={(value) => setBusy((count) => count + (value ? 1 : -1))}
      />
      <VideoUpload
        label="Esecuzione"
        existingId={initial?.executionVideoId ?? null}
        onUploaded={setExecutionUploadId}
        onBusy={(value) => setBusy((count) => count + (value ? 1 : -1))}
      />
      {error ? (
        <p className="text-base font-bold" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="flex min-h-14 items-center justify-center rounded-2xl bg-accent px-4 text-lg font-extrabold text-white disabled:opacity-50" disabled={saving || busy > 0}>
        Salva esercizio
      </button>
      {initial?.id && !initial.archived ? (
        <button type="button" className="min-h-12 text-base font-bold text-muted" onClick={() => void archive()} disabled={saving}>
          Archivia
        </button>
      ) : null}
    </form>
  );
}
