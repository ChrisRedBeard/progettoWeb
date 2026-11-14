import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAthleteApi } from "@/lib/auth/api-athlete";
import { touchSession } from "@/lib/lobby/service";

const bodySchema = z.object({
  exerciseId: z.string().min(1).nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const athlete = await requireAthleteApi();
  if (!athlete.ok) return athlete.response;
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  const { id } = await context.params;
  const result = await touchSession({
    sessionId: id,
    athleteId: athlete.userId,
    exerciseId: parsed.data.exerciseId,
  });
  if (!result.ok) return NextResponse.json({ error: "Sessione non attiva" }, { status: result.status });
  return NextResponse.json({ ok: true });
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
