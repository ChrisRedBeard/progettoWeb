import { NextResponse } from "next/server";
import { requireAthleteApi } from "@/lib/auth/api-athlete";
import { prisma } from "@/lib/prisma";
import { sessionWriteAccess } from "@/lib/training/session-access";
import { feedbackBodySchema } from "@/lib/validators/training";

export async function POST(request: Request) {
  const athlete = await requireAthleteApi();
  if (!athlete.ok) return athlete.response;

  const parsed = feedbackBodySchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  await prisma.user.update({
    where: { id: athlete.userId },
    data: { feedbackMode: parsed.data.mode },
  });

  if (parsed.data.sessionId) {
    const session = await prisma.workoutSession.findUnique({
      where: { id: parsed.data.sessionId },
      select: { id: true, athleteId: true, status: true },
    });
    const access = sessionWriteAccess(session, athlete.userId);
    if (access.ok && session) {
      await prisma.workoutSession.update({
        where: { id: session.id },
        data: { feedbackMode: parsed.data.mode },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
