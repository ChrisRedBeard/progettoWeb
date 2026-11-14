import { notFound } from "next/navigation";
import { TrainingFlow } from "@/components/training/training-flow";
import { consentIsCurrent } from "@/lib/consent";
import { requireRole } from "@/lib/auth/current-user";
import { playableVideoId } from "@/lib/library/schema";
import { prisma } from "@/lib/prisma";
import { toTrainingExercise } from "@/lib/training/exercise";

export default async function GuidedWorkoutPage({
  params,
}: {
  params: Promise<{ assignmentId: string; workoutExerciseId: string }>;
}) {
  const { assignmentId, workoutExerciseId } = await params;
  const user = await requireRole("ATHLETE");
  const [assignment, athlete] = await Promise.all([
    prisma.workoutAssignment.findFirst({
      where: { id: assignmentId, athleteId: user.id, active: true },
      include: {
        workout: {
          include: {
            exercises: {
              where: { id: workoutExerciseId, removedAt: null },
              include: { exercise: { include: { videos: true } } },
            },
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { consentAt: true, consentVersion: true, feedbackMode: true },
    }),
  ]);
  const item = assignment?.workout.exercises[0];
  if (!assignment || !item || !athlete) notFound();
  const explanation = item.exercise.videos.find((video) => video.kind === "EXPLANATION");
  const execution = item.exercise.videos.find((video) => video.kind === "EXECUTION");

  return (
    <TrainingFlow
      mode="assigned"
      exercise={toTrainingExercise({
        id: item.exercise.id,
        title: item.exercise.title,
        description: item.exercise.description,
        analysisType: item.exercise.analysisType,
        analysisKey: item.exercise.analysisKey,
        sets: item.sets ?? item.exercise.defaultSets,
        reps: item.reps ?? item.exercise.defaultReps,
        tempo: item.tempo ?? item.exercise.defaultTempo,
        restSeconds: item.restSeconds ?? item.exercise.defaultRestSeconds,
      })}
      videos={{ explanation: playableVideoId(explanation), execution: playableVideoId(execution) }}
      feedbackMode={athlete.feedbackMode}
      hasConsent={consentIsCurrent(athlete.consentAt, athlete.consentVersion)}
      assignmentId={assignment.id}
      workoutExerciseId={item.id}
      exitHref="/workout"
    />
  );
}
