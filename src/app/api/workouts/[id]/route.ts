import { NextResponse } from "next/server";
import { requireCoachApi } from "@/lib/auth/api-athlete";
import { LibraryError } from "@/lib/library/errors";
import { workoutSaveSchema } from "@/lib/library/schema";
import { saveWorkout } from "@/lib/library/workouts";

type RouteContext = { params: Promise<{ id: string }> };

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const coach = await requireCoachApi();
  if (!coach.ok) return coach.response;
  const parsed = workoutSaveSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Controlla i campi della scheda." }, { status: 400 });
  const { id } = await context.params;
  try {
    return NextResponse.json(await saveWorkout(coach.userId, id, parsed.data));
  } catch (error) {
    if (error instanceof LibraryError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
