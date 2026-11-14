import { NextResponse } from "next/server";
import { requireCoachApi } from "@/lib/auth/api-athlete";
import { LibraryError } from "@/lib/library/errors";
import { assignWorkoutSchema } from "@/lib/library/schema";
import { assignWorkout } from "@/lib/library/workouts";

type RouteContext = { params: Promise<{ id: string }> };

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request, context: RouteContext) {
  const coach = await requireCoachApi();
  if (!coach.ok) return coach.response;
  const parsed = assignWorkoutSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Scegli almeno un cliente." }, { status: 400 });
  const { id } = await context.params;
  try {
    const result = await assignWorkout({ coachUserId: coach.userId, workoutId: id, ...parsed.data });
    if (!result.ok) return NextResponse.json({ error: "C'è già una scheda attiva.", closing: result.closing }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof LibraryError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
