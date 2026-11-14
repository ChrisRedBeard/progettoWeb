"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-3xl font-extrabold">Qualcosa è andato storto</h1>
      <p className="mt-3 text-lg text-muted">Non siamo riusciti a caricare questa pagina.</p>
      <button type="button" onClick={reset} className="mt-6 min-h-12 rounded-xl bg-accent px-5 font-bold text-white">
        Riprova
      </button>
    </main>
  );
}
