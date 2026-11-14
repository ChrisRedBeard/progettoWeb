"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewWorkoutForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        const response = await fetch("/api/workouts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title }),
        });
        const body = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
        if (!response.ok || !body.id) {
          setError(body.error ?? "Scheda non creata.");
          return;
        }
        router.push(`/workouts/${body.id}`);
      }}
    >
      <label className="flex-1 text-base font-bold">
        Nuova scheda
        <input
          className="mt-2 w-full rounded-2xl border border-line bg-panel px-4 py-3 text-lg"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Titolo"
          maxLength={80}
          required
        />
      </label>
      <button type="submit" className="mt-7 flex min-h-14 items-center justify-center rounded-2xl bg-accent px-5 text-lg font-extrabold text-white">
        Crea
      </button>
      {error ? (
        <p className="text-base font-bold" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
