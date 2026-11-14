import { NextResponse } from "next/server";
import { requireAthleteApi } from "@/lib/auth/api-athlete";
import { notifySessionEnded } from "@/lib/lobby/service";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const athlete = await requireAthleteApi();
  if (!athlete.ok) return athlete.response;

  const { id } = await context.params;
  const session = await prisma.workoutSession.findUnique({
    where: { id },
    select: { id: true, athleteId: true, status: true },
  });
  if (!session) return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
  if (session.athleteId !== athlete.userId) {
    return NextResponse.json({ error: "Sessione non modificabile" }, { status: 403 });
  }
  if (session.status === "COMPLETED") {
    return NextResponse.json({ error: "Sessione già conclusa" }, { status: 409 });
  }
  if (session.status !== "ABANDONED") {
    await prisma.workoutSession.update({
      where: { id: session.id },
      data: { status: "ABANDONED", endedAt: new Date() },
    });
    await notifySessionEnded(session.athleteId, session.id);
  }
  return NextResponse.json({ status: "ABANDONED" });
}
