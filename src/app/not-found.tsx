import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-3xl font-extrabold">Pagina non trovata</h1>
      <p className="mt-3 text-lg text-muted">Questo indirizzo non corrisponde a una schermata di FIT AI.</p>
      <Link href="/" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-accent px-5 font-bold text-white">
        Torna alla home
      </Link>
    </main>
  );
}
