"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const fieldClass = "mt-2 w-full rounded-2xl border border-line bg-panel px-4 py-3 text-lg";

export type EditorExercise = {
  key: string;
  id: string | null;
  exerciseId: string;
  title: string;
  sets: number;
  reps: number;
  tempo: string;
  restSeconds: number;
  notes: string;
};

export type AddableExercise = {
  id: string;
  title: string;
  sets: number;
  reps: number;
  tempo: string;
  restSeconds: number;
};

export type AssignableAthlete = {
  id: string;
  name: string;
  activeTitle: string | null;
  activeAssignmentId: string | null;
  activeWorkoutId: string | null;
};

export function WorkoutEditor({
  workoutId,
  title,
  exercises,
  library,
  athletes,
}: {
  workoutId: string;
  title: string;
  exercises: EditorExercise[];
  library: AddableExercise[];
  athletes: AssignableAthlete[];
}) {
  const router = useRouter();
  const [name, setName] = useState(title);
  const [items, setItems] = useState(exercises);
  const [picked, setPicked] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [closing, setClosing] = useState<{ athleteName: string; workoutTitle: string }[] | null>(null);
  const [saving, setSaving] = useState(false);

  function move(index: number, delta: number) {
    setItems((current) => {
      const next = index + delta;
      if (next < 0 || next >= current.length) return current;
      const copy = current.slice();
      const [row] = copy.splice(index, 1);
      if (!row) return current;
      copy.splice(next, 0, row);
      return copy;
    });
  }

  function add(exerciseId: string) {
    const source = library.find((item) => item.id === exerciseId);
    if (!source) return;
    setItems((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        id: null,
        exerciseId: source.id,
        title: source.title,
        sets: source.sets,
        reps: source.reps,
        tempo: source.tempo,
        restSeconds: source.restSeconds,
        notes: "",
      },
    ]);
    setPicked("");
  }

  async function save() {
    setError(null);
    setNotice(null);
    setSaving(true);
    const response = await fetch(`/api/workouts/${workoutId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: name,
        exercises: items.map((item) => ({
          id: item.id,
          exerciseId: item.exerciseId,
          sets: item.sets,
          reps: item.reps,
          tempo: item.tempo.trim() ? item.tempo.trim() : null,
          restSeconds: item.restSeconds,
          notes: item.notes.trim() ? item.notes.trim() : null,
        })),
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string; exercises?: { id: string }[] };
    setSaving(false);
    if (!response.ok || !body.exercises) {
      setError(body.error ?? "Salvataggio non riuscito.");
      return;
    }
    setItems((current) => current.map((item, index) => ({ ...item, id: body.exercises?.[index]?.id ?? item.id })));
    setNotice("Scheda salvata.");
    router.refresh();
  }

  async function assign(confirmClose: boolean) {
    setError(null);
    setNotice(null);
    if (selected.length === 0) {
      setError("Scegli almeno un cliente.");
      return;
    }
    const response = await fetch(`/api/workouts/${workoutId}/assign`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ athleteIds: selected, confirmClose }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      closing?: { athleteName: string; workoutTitle: string }[];
    };
    if (response.status === 409 && body.closing) {
      setClosing(body.closing);
      return;
    }
    if (!response.ok) {
      setError(body.error ?? "Assegnazione non riuscita.");
      return;
    }
    setClosing(null);
    setNotice("Scheda assegnata.");
    router.refresh();
  }

  async function close(assignmentId: string) {
    setError(null);
    const response = await fetch(`/api/assignments/${assignmentId}/close`, { method: "POST" });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(body.error ?? "Chiusura non riuscita.");
      return;
    }
    setNotice("Scheda chiusa.");
    router.refresh();
  }

  return (
    <div className="mt-6 grid max-w-3xl gap-6">
      <p className="text-base text-muted">
        Un cliente già dentro l&apos;esercizio continua con i numeri letti all&apos;avvio. Frecce su e giù per riordinare. I pulsanti funzionano anche al tocco.
      </p>
      <label className="text-base font-bold">
        Titolo
        <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
      </label>
      <label className="text-base font-bold">
        Aggiungi dalla libreria
        <select
          className={fieldClass}
          value={picked}
          onChange={(event) => {
            add(event.target.value);
          }}
        >
          <option value="">Scegli un esercizio</option>
          {library.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      <ol className="grid gap-4">
        {items.map((item, index) => (
          <li
            key={item.key}
            id={`scheda-${item.key}`}
            tabIndex={0}
            className="rounded-2xl border border-line bg-panel p-4 outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onKeyDown={(event) => {
              if (event.key === "ArrowUp") {
                event.preventDefault();
                move(index, -1);
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                move(index, 1);
              }
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold">{item.title}</h2>
              <div className="flex gap-2">
                <button type="button" className="min-h-12 rounded-2xl border border-line px-4 font-bold" aria-label={`Sposta su ${item.title}`} onClick={() => move(index, -1)}>
                  Su
                </button>
                <button type="button" className="min-h-12 rounded-2xl border border-line px-4 font-bold" aria-label={`Sposta giù ${item.title}`} onClick={() => move(index, 1)}>
                  Giù
                </button>
                <button type="button" className="min-h-12 rounded-2xl border border-line px-4 font-bold" onClick={() => setItems((current) => current.filter((row) => row.key !== item.key))}>
                  Rimuovi
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <NumberField label="Serie" value={item.sets} onChange={(sets) => update(item.key, { sets })} />
              <NumberField label="Ripetizioni" value={item.reps} onChange={(reps) => update(item.key, { reps })} />
              <label className="text-base font-bold">
                Tempo
                <input className={fieldClass} value={item.tempo} maxLength={20} onChange={(event) => update(item.key, { tempo: event.target.value })} />
              </label>
              <NumberField label="Recupero (secondi)" value={item.restSeconds} onChange={(restSeconds) => update(item.key, { restSeconds })} />
            </div>
            <label className="mt-3 block text-base font-bold">
              Note
              <textarea className={fieldClass} rows={2} maxLength={300} value={item.notes} onChange={(event) => update(item.key, { notes: event.target.value })} />
            </label>
          </li>
        ))}
      </ol>
      <button type="button" className="flex min-h-14 items-center justify-center rounded-2xl bg-accent px-4 text-lg font-extrabold text-white disabled:opacity-50" disabled={saving} onClick={() => void save()}>
        Salva scheda
      </button>
      <section className="grid gap-3">
        <h2 className="text-2xl font-extrabold">Assegna</h2>
        {athletes.length === 0 ? <p className="text-base text-muted">Nessun cliente in lobby.</p> : null}
        {athletes.map((athlete) => (
          <div key={athlete.id} className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-panel px-4">
            <label className="flex flex-1 items-center gap-3">
              <input
                type="checkbox"
                checked={selected.includes(athlete.id)}
                onChange={(event) =>
                  setSelected((current) => (event.target.checked ? [...current, athlete.id] : current.filter((id) => id !== athlete.id)))
                }
              />
              <span className="text-lg font-bold">
                {athlete.name}
                {athlete.activeTitle ? <span className="mt-1 block text-base font-semibold text-muted">Scheda attiva: {athlete.activeTitle}</span> : null}
              </span>
            </label>
            {athlete.activeWorkoutId === workoutId && athlete.activeAssignmentId ? (
              <button type="button" className="min-h-12 font-bold" onClick={() => void close(athlete.activeAssignmentId!)}>
                Chiudi
              </button>
            ) : null}
          </div>
        ))}
        <button type="button" className="flex min-h-14 items-center justify-center rounded-2xl border border-line px-4 text-lg font-extrabold" onClick={() => void assign(false)}>
          Assegna ai clienti selezionati
        </button>
        {closing ? (
          <div className="rounded-2xl border border-line bg-panel p-4" role="alert">
            <p className="text-lg font-extrabold">Questa assegnazione chiude la scheda già attiva.</p>
            <ul className="mt-2 grid gap-1">
              {closing.map((row) => (
                <li key={`${row.athleteName}-${row.workoutTitle}`}>
                  {row.athleteName}: si chiude «{row.workoutTitle}».
                </li>
              ))}
            </ul>
            <button type="button" className="mt-3 flex min-h-14 w-full items-center justify-center rounded-2xl bg-accent px-4 text-lg font-extrabold text-white" onClick={() => void assign(true)}>
              Conferma e chiudi la precedente
            </button>
          </div>
        ) : null}
      </section>
      {error ? (
        <p className="text-base font-bold" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p className="text-base font-bold">{notice}</p> : null}
    </div>
  );

  function update(key: string, patch: Partial<EditorExercise>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="text-base font-bold">
      {label}
      <input
        className={fieldClass}
        inputMode="numeric"
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
