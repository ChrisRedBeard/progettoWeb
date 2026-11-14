import Link from "next/link";
import { requireRole } from "@/lib/auth/current-user";
import { toTrainingExercise } from "@/lib/training/exercise";
import { prisma } from "@/lib/prisma";

export default async function ExplorePage() {
  const user = await requireRole("ATHLETE");
  const [membership, exercises] = await Promise.all([
    prisma.membership.findUnique({
      where: { athleteId: user.id },
      include: { lobby: { include: { coach: { include: { user: { select: { name: true } } } } } } },
    }),
    prisma.exercise.findMany({
      where: { visibility: "PUBLIC", archivedAt: null, coachId: null },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <section>
      <h1 className="text-3xl font-extrabold tracking-tight">Esplora</h1>
      <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">
        Ciao {user.name}. Scegli un esercizio e allenati con la camera.
        {membership ? ` Hai anche la scheda di ${membership.lobby.coach.user.name}.` : ""}
      </p>
      {exercises.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-line bg-panel p-5 text-lg">Nessun esercizio pubblico disponibile.</p>
      ) : (
        <ul className="mt-6 grid gap-4">
          {exercises.map((exercise) => {
            const view = toTrainingExercise({
              id: exercise.id,
              title: exercise.title,
              description: exercise.description,
              analysisType: exercise.analysisType,
              analysisKey: exercise.analysisKey,
              sets: exercise.defaultSets,
              reps: exercise.defaultReps,
              tempo: exercise.defaultTempo,
              restSeconds: exercise.defaultRestSeconds,
            });
            return (
              <li key={exercise.id} className="rounded-2xl border border-line bg-panel p-5">
                <h2 className="text-2xl font-extrabold">{view.title}</h2>
                {view.description ? <p className="mt-2 text-lg leading-7 text-muted">{view.description}</p> : null}
                <p className="mt-3 text-base font-semibold">
                  {view.sets} serie · {view.reps} {view.countLabel}
                  {view.tempo ? ` · tempo ${view.tempo}` : ""}
                </p>
                <Link href={`/train/${exercise.id}`} className="mt-4 flex min-h-14 items-center justify-center rounded-2xl bg-accent px-4 text-lg font-extrabold text-white">
                  Inizia
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
