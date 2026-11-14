import { notFound } from "next/navigation";
import { WorkoutEditor } from "@/components/library/workout-editor";
import { requireRole } from "@/lib/auth/current-user";
import { addableExercises } from "@/lib/library/exercises";
import { getWorkoutEditor } from "@/lib/library/workouts";

export default async function WorkoutEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("COACH");
  const [workout, library] = await Promise.all([getWorkoutEditor(user.id, id), addableExercises(user.id)]);
  if (!workout || !library) notFound();

  return (
    <section>
      <h1 className="text-3xl font-extrabold tracking-tight">{workout.title}</h1>
      <WorkoutEditor
        workoutId={workout.id}
        title={workout.title}
        library={library}
        athletes={workout.athletes}
        exercises={workout.exercises.map((item) => ({ ...item, key: item.id }))}
      />
    </section>
  );
}
