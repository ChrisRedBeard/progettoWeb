import { NextResponse } from "next/server";
import { requireCoachApi } from "@/lib/auth/api-athlete";
import { createExercise } from "@/lib/library/exercises";
import { LibraryError } from "@/lib/library/errors";
import { exerciseInputSchema } from "@/lib/library/schema";

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
  const parsed = exerciseInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Controlla i campi dell'esercizio." }, { status: 400 });
  try {
    const id = await createExercise(coach.userId, parsed.data);
    return NextResponse.json({ id });
  } catch (error) {
    if (error instanceof LibraryError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
