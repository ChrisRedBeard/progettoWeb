import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAthleteApi } from "@/lib/auth/api-athlete";
import { notifySessionEnded } from "@/lib/lobby/service";
import { prisma } from "@/lib/prisma";
import { sessionWriteAccess } from "@/lib/training/session-access";
import { setResultBodySchema } from "@/lib/validators/training";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const athlete = await requireAthleteApi();
  if (!athlete.ok) return athlete.response;

  const parsed = setResultBodySchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  const { id } = await context.params;
  const session = await prisma.workoutSession.findUnique({
    where: { id },
    select: {
      id: true,
      athleteId: true,
      status: true,
      assignment: {
        select: { workout: { select: { exercises: { select: { id: true, exerciseId: true } } } } },
      },
    },
  });

  if (!session) return NextResponse.json({ error: "Sessione non modificabile" }, { status: 404 });
  if (session.athleteId !== athlete.userId) {
    return NextResponse.json({ error: "Sessione non modificabile" }, { status: 403 });
  }

  const body = parsed.data;
  if (session.status === "COMPLETED") {
    const existing = await prisma.setResult.findFirst({
      where: { sessionId: session.id, setNumber: body.setNumber, exerciseId: body.exerciseId },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ id: existing.id });
  }

  const access = sessionWriteAccess(session, athlete.userId);
  if (!access.ok) return NextResponse.json({ error: "Sessione non modificabile" }, { status: access.status });
  const linked = session.assignment?.workout.exercises ?? [];
  if (body.workoutExerciseId) {
    const belongs = linked.some((item) => item.id === body.workoutExerciseId && item.exerciseId === body.exerciseId);
    if (!belongs) return NextResponse.json({ error: "Esercizio non in scheda" }, { status: 403 });
  } else if (session.assignment) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  const exercise = await prisma.exercise.findUnique({ where: { id: body.exerciseId }, select: { id: true } });
  if (!exercise) return NextResponse.json({ error: "Esercizio non trovato" }, { status: 404 });

  const saved = await prisma.$transaction(async (tx) => {
    const existing = await tx.setResult.findFirst({
      where: { sessionId: session.id, setNumber: body.setNumber, exerciseId: body.exerciseId },
      select: { id: true },
    });
    const row =
      existing ??
      (await tx.setResult.create({
        data: {
          sessionId: session.id,
          workoutExerciseId: body.workoutExerciseId,
          exerciseId: body.exerciseId,
          setNumber: body.setNumber,
          repsDone: body.repsDone,
          formScore: body.formScore,
          errors: body.errors as Prisma.InputJsonValue,
          trackingLost: body.trackingLost,
        },
        select: { id: true },
      }));

    if (body.complete) {
      await tx.workoutSession.update({
        where: { id: session.id },
        data: { status: "COMPLETED", endedAt: new Date() },
      });
    }
    return row;
  });

  if (body.complete) await notifySessionEnded(session.athleteId, session.id);

  return NextResponse.json({ id: saved.id });
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
