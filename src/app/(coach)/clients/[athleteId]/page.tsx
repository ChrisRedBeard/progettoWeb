import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/current-user";
import { movementCue, parseStoredMovementErrors, type MovementErrorCode } from "@/lib/integrations/movement";
import { loadClient } from "@/lib/lobby/service";

export default async function ClientPage({ params }: { params: Promise<{ athleteId: string }> }) {
  const { athleteId } = await params;
  const user = await requireRole("COACH");
  const client = await loadClient(user.id, athleteId);
  if (!client) notFound();

  const counts = new Map<MovementErrorCode, number>();
  for (const session of client.sessions) {
    for (const set of session.setResults) {
      const parsed = parseStoredMovementErrors(set.errors);
      if (!parsed.ok) continue;
      for (const error of parsed.errors) counts.set(error.code, (counts.get(error.code) ?? 0) + 1);
    }
  }
  const recurring = [...counts.entries()].filter(([, count]) => count >= 2);

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-extrabold tracking-tight">{client.membership.athlete.name}</h1>
      <p className="mt-2 text-lg text-muted">{client.membership.athlete.email}</p>

      <h2 className="mt-8 text-2xl font-extrabold">Scheda attiva</h2>
      {client.assignment ? (
        <div className="mt-3 rounded-2xl border border-line bg-panel p-4">
          <p className="text-lg font-extrabold">{client.assignment.workout.title}</p>
          <ul className="mt-2 list-disc pl-5 text-base">
            {client.assignment.workout.exercises.map((item) => (
              <li key={item.id}>{item.exercise.title}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-lg text-muted">Nessuna scheda attiva.</p>
      )}

      <h2 className="mt-8 text-2xl font-extrabold">Ultime sessioni</h2>
      <ul className="mt-3 grid gap-3">
        {client.sessions.length === 0 ? <li className="text-lg text-muted">Nessuna sessione.</li> : null}
        {client.sessions.map((session) => (
          <li key={session.id} className="rounded-2xl border border-line bg-panel p-4">
            <p className="font-extrabold">
              {formatWhen(session.startedAt)} · {sessionLabel(session.status)}
            </p>
            <p className="text-base text-muted">
              {session.setResults.length === 0
                ? "Nessuna serie salvata"
                : [...new Set(session.setResults.map((set) => client.titles.get(set.exerciseId) ?? "Esercizio"))].join(", ")}
            </p>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-2xl font-extrabold">Errori ricorrenti</h2>
      {recurring.length === 0 ? (
        <p className="mt-3 text-lg text-muted">Nessun errore ripetuto.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {recurring.map(([code, count]) => (
            <li key={code} className="rounded-2xl border border-line bg-panel px-4 py-3 text-lg">
              {movementCue(code)} <span className="text-muted">×{count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function sessionLabel(status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED") {
  if (status === "IN_PROGRESS") return "In corso";
  if (status === "COMPLETED") return "Completata";
  return "Interrotta";
}

function formatWhen(value: Date) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(value);
}
