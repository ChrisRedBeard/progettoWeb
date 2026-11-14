import Link from "next/link";
import { auth } from "@/auth";
import { homeForRole, isAppRole } from "@/lib/auth/roles";

export default async function LandingPage() {
  const session = await auth();
  const role = session?.user?.role;
  const home = isAppRole(role) ? homeForRole(role) : "/register";

  return (
    <section className="grid gap-10 py-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Allenamento a casa</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Train smarter, anche senza una palestra.</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
          FIT AI segue il movimento dalla camera e ti corregge. Se hai un coach, entri nella sua lobby privata e svolgi la scheda che ti assegna.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={home} className="inline-flex min-h-14 items-center justify-center rounded-xl bg-accent px-6 text-lg font-bold text-white">
            {isAppRole(role) ? "Vai al tuo spazio" : "Crea un account"}
          </Link>
          <Link href="/login" className="inline-flex min-h-14 items-center justify-center rounded-xl border border-line px-6 text-lg font-bold">
            Ho già un account
          </Link>
        </div>
      </div>
      <aside className="rounded-2xl border border-line bg-panel p-6">
        <h2 className="text-xl font-extrabold">Due modi di allenarti</h2>
        <ul className="mt-4 space-y-4 text-base leading-7">
          <li>
            <strong>Da solo.</strong> Scegli un esercizio pubblico e segui i consigli dell&apos;assistente.
          </li>
          <li>
            <strong>Con il coach.</strong> Accetti un invito, entri nella sua lobby e lui può seguirti in diretta, salvo che tu attivi la modalità privata.
          </li>
        </ul>
      </aside>
    </section>
  );
}
