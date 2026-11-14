import { NextResponse } from "next/server";
import { requireAthleteApi } from "@/lib/auth/api-athlete";
import { openTrainingSession } from "@/lib/lobby/service";
import { prisma } from "@/lib/prisma";
import { createSessionSchema } from "@/lib/validators/training";

export async function POST(request: Request) {
  const athlete = await requireAthleteApi();
  if (!athlete.ok) return athlete.response;

  const parsed = createSessionSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: athlete.userId },
    select: { feedbackMode: true },
  });
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { exerciseId, mode, assignmentId, workoutExerciseId } = parsed.data;
  if (mode === "free") {
    if (assignmentId || workoutExerciseId) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
    }
    const exercise = await prisma.exercise.findFirst({
      where: { id: exerciseId, visibility: "PUBLIC", archivedAt: null },
      select: { id: true },
    });
    if (!exercise) return NextResponse.json({ error: "Esercizio non trovato" }, { status: 404 });
  } else {
    if (!assignmentId || !workoutExerciseId) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
    }
    const assignment = await prisma.workoutAssignment.findFirst({
      where: { id: assignmentId, athleteId: athlete.userId, active: true },
      select: {
        workout: {
          select: { exercises: { where: { id: workoutExerciseId, exerciseId }, select: { id: true } } },
        },
      },
    });
    if (!assignment || assignment.workout.exercises.length === 0) {
      return NextResponse.json({ error: "Scheda non disponibile" }, { status: 403 });
    }
  }

  const sessionId = await openTrainingSession({
    athleteId: athlete.userId,
    exerciseId,
    assignmentId: mode === "assigned" ? assignmentId : null,
    feedbackMode: user.feedbackMode,
  });

  return NextResponse.json({ id: sessionId });
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
