import { ExerciseForm } from "@/components/library/exercise-form";
import { requireRole } from "@/lib/auth/current-user";

export default async function NewExercisePage() {
  await requireRole("COACH");
  return (
    <section>
      <h1 className="text-3xl font-extrabold tracking-tight">Nuovo esercizio</h1>
      <ExerciseForm />
    </section>
  );
}
