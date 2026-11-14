import { notFound } from "next/navigation";
import { TrainingFlow } from "@/components/training/training-flow";
import { requireRole } from "@/lib/auth/current-user";
import { consentIsCurrent } from "@/lib/consent";
import { playableVideoId } from "@/lib/library/schema";
import { prisma } from "@/lib/prisma";
import { toTrainingExercise } from "@/lib/training/exercise";

export default async function TrainPage({ params }: { params: Promise<{ exerciseId: string }> }) {
  const { exerciseId } = await params;
  const user = await requireRole("ATHLETE");
  const [exercise, athlete] = await Promise.all([
    prisma.exercise.findFirst({
      where: { id: exerciseId, visibility: "PUBLIC", archivedAt: null },
      include: { videos: true },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { consentAt: true, consentVersion: true, feedbackMode: true },
    }),
  ]);
  if (!exercise || !athlete) notFound();
  const explanation = exercise.videos.find((video) => video.kind === "EXPLANATION");
  const execution = exercise.videos.find((video) => video.kind === "EXECUTION");

  return (
    <TrainingFlow
      mode="free"
      exercise={toTrainingExercise({
        id: exercise.id,
        title: exercise.title,
        description: exercise.description,
        analysisType: exercise.analysisType,
        analysisKey: exercise.analysisKey,
        sets: exercise.defaultSets,
        reps: exercise.defaultReps,
        tempo: exercise.defaultTempo,
        restSeconds: exercise.defaultRestSeconds,
      })}
      videos={{ explanation: playableVideoId(explanation), execution: playableVideoId(execution) }}
      feedbackMode={athlete.feedbackMode}
      hasConsent={consentIsCurrent(athlete.consentAt, athlete.consentVersion)}
      assignmentId={null}
      workoutExerciseId={null}
      exitHref="/explore"
    />
  );
}
