import Link from "next/link";
import { notFound } from "next/navigation";
import { NewWorkoutForm } from "@/components/library/new-workout-form";
import { requireRole } from "@/lib/auth/current-user";
import { listWorkouts } from "@/lib/library/workouts";

export default async function WorkoutsPage() {
  const user = await requireRole("COACH");
  const workouts = await listWorkouts(user.id);
  if (!workouts) notFound();

  return (
    <section>
      <h1 className="text-3xl font-extrabold tracking-tight">Schede</h1>
      <NewWorkoutForm />
      <ul className="mt-8 grid gap-3">
        {workouts.length === 0 ? <li className="text-lg text-muted">Non hai ancora schede.</li> : null}
        {workouts.map((workout) => (
          <li key={workout.id}>
            <Link href={`/workouts/${workout.id}`} className="block rounded-2xl border border-line bg-panel p-4">
              <span className="text-xl font-extrabold">{workout.title}</span>
              <span className="mt-1 block text-base font-semibold text-muted">
                {workout.exercises === 1 ? "1 esercizio" : `${workout.exercises} esercizi`} ·{" "}
                {workout.activeAssignments === 1 ? "1 assegnazione attiva" : `${workout.activeAssignments} assegnazioni attive`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
