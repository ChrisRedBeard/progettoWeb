import Link from "next/link";
import { RefreshAssignment } from "@/components/library/refresh-assignment";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { toTrainingExercise } from "@/lib/training/exercise";

export default async function AssignedWorkoutPage() {
  const user = await requireRole("ATHLETE");
  const assignment = await prisma.workoutAssignment.findFirst({
    where: { athleteId: user.id, active: true },
    orderBy: { assignedAt: "desc" },
    include: {
      workout: {
        include: {
          exercises: {
            where: { removedAt: null },
            orderBy: { position: "asc" },
            include: { exercise: true },
          },
        },
      },
    },
  });

  if (!assignment) {
    return (
      <section>
        <RefreshAssignment />
        <h1 className="text-3xl font-extrabold tracking-tight">Scheda</h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">Non hai una scheda attiva. Puoi allenarti dal catalogo.</p>
      </section>
    );
  }

  return (
    <section>
      <RefreshAssignment />
      <h1 className="text-3xl font-extrabold tracking-tight">{assignment.workout.title}</h1>
      <p className="mt-3 text-lg text-muted">Apri un esercizio per allenarti. Se il coach entra, lo vedi durante la serie e puoi chiudere la diretta.</p>
      <ul className="mt-6 grid gap-4">
        {assignment.workout.exercises.map((item) => {
          const view = toTrainingExercise({
            id: item.exercise.id,
            title: item.exercise.title,
            description: item.exercise.description,
            analysisType: item.exercise.analysisType,
            analysisKey: item.exercise.analysisKey,
            sets: item.sets ?? item.exercise.defaultSets,
            reps: item.reps ?? item.exercise.defaultReps,
            tempo: item.tempo ?? item.exercise.defaultTempo,
            restSeconds: item.restSeconds ?? item.exercise.defaultRestSeconds,
          });
          return (
            <li key={item.id} className="rounded-2xl border border-line bg-panel p-5">
              <h2 className="text-2xl font-extrabold">{view.title}</h2>
              <p className="mt-2 text-base font-semibold">
                {view.sets} serie · {view.reps} {view.countLabel}
              </p>
              <Link
                href={`/workout/${assignment.id}/${item.id}`}
                className="mt-4 flex min-h-14 items-center justify-center rounded-2xl bg-accent px-4 text-lg font-extrabold text-white"
              >
                Inizia
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
