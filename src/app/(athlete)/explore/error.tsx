"use client";

export default function ExploreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section>
      <h1 className="text-3xl font-extrabold">Catalogo non disponibile</h1>
      <p className="mt-3 text-lg text-muted">Non sono riuscito a leggere gli esercizi.</p>
      <button type="button" onClick={reset} className="mt-6 min-h-14 rounded-2xl bg-accent px-5 text-lg font-extrabold text-white">
        Riprova
      </button>
    </section>
  );
}
