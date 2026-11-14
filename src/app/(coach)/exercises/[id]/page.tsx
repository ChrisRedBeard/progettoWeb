import { notFound } from "next/navigation";
import { ExerciseForm } from "@/components/library/exercise-form";
import { VideoPlayer } from "@/components/training/video-player";
import { requireRole } from "@/lib/auth/current-user";
import { getCoachExercise } from "@/lib/library/exercises";

export default async function ExerciseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("COACH");
  const exercise = await getCoachExercise(user.id, id);
  if (!exercise) notFound();

  if (exercise.readOnly) {
    return (
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight">{exercise.title}</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">Catalogo di sistema, in sola lettura. {exercise.analysisLabel}.</p>
        {exercise.description ? <p className="mt-4 max-w-2xl text-lg leading-7">{exercise.description}</p> : null}
        <p className="mt-4 text-base font-semibold">
          {exercise.defaultSets} serie · {exercise.defaultReps} ripetizioni · recupero {exercise.defaultRestSeconds} secondi
        </p>
        <div className="mt-6 grid max-w-2xl gap-4">
          <VideoPlayer title="Spiegazione" videoId={exercise.explanationVideoId} />
          <VideoPlayer title="Esecuzione" videoId={exercise.executionVideoId} />
        </div>
      </section>
    );
  }

  return (
    <section>
      <h1 className="text-3xl font-extrabold tracking-tight">Modifica esercizio</h1>
      <ExerciseForm
        initial={{
          id: exercise.id,
          title: exercise.title,
          description: exercise.description,
          defaultSets: exercise.defaultSets,
          defaultReps: exercise.defaultReps,
          defaultTempo: exercise.defaultTempo,
          defaultRestSeconds: exercise.defaultRestSeconds,
          visibility: exercise.visibility,
          archived: exercise.archived,
          explanationVideoId: exercise.explanationVideoId,
          executionVideoId: exercise.executionVideoId,
        }}
      />
    </section>
  );
}
