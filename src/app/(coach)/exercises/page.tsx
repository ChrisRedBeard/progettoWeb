import Link from "next/link";
import { requireRole } from "@/lib/auth/current-user";
import { listLibrary } from "@/lib/library/exercises";
import { notFound } from "next/navigation";

export default async function ExercisesPage() {
  const user = await requireRole("COACH");
  const library = await listLibrary(user.id);
  if (!library) notFound();

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Libreria esercizi</h1>
        <Link href="/exercises/new" className="flex min-h-14 items-center rounded-2xl bg-accent px-5 text-lg font-extrabold text-white">
          Nuovo esercizio
        </Link>
      </div>
      <ExerciseList title="I tuoi esercizi" empty="Non hai ancora esercizi." items={library.own} />
      <ExerciseList title="Catalogo di sistema" empty="Nessun esercizio di sistema." items={library.catalog} catalog />
      <ExerciseList title="Archiviati" empty="Nessun esercizio archiviato." items={library.archived} />
    </section>
  );
}

function ExerciseList({
  title,
  empty,
  items,
  catalog = false,
}: {
  title: string;
  empty: string;
  catalog?: boolean;
  items: { id: string; title: string; visibility: "PRIVATE" | "PUBLIC"; sets: number; reps: number }[];
}) {
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-extrabold">{title}</h2>
      {items.length === 0 ? <p className="mt-3 text-lg text-muted">{empty}</p> : null}
      <ul className="mt-4 grid gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={`/exercises/${item.id}`} className="block rounded-2xl border border-line bg-panel p-4">
              <span className="text-xl font-extrabold">{item.title}</span>
              <span className="mt-1 block text-base font-semibold text-muted">
                {item.sets} serie · {item.reps} ripetizioni
                {catalog ? " · sola lettura" : item.visibility === "PUBLIC" ? " · pubblico" : " · privato"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
