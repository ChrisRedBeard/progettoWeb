import { NextResponse } from "next/server";
import { requireCoachApi } from "@/lib/auth/api-athlete";
import { LibraryError } from "@/lib/library/errors";
import { workoutTitleSchema } from "@/lib/library/schema";
import { createWorkout } from "@/lib/library/workouts";

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const coach = await requireCoachApi();
  if (!coach.ok) return coach.response;
  const parsed = workoutTitleSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Scrivi un titolo." }, { status: 400 });
  try {
    const id = await createWorkout(coach.userId, parsed.data.title);
    return NextResponse.json({ id });
  } catch (error) {
    if (error instanceof LibraryError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
