import { NextResponse } from "next/server";
import { requireCoachApi } from "@/lib/auth/api-athlete";
import { LibraryError } from "@/lib/library/errors";
import { updateExercise } from "@/lib/library/exercises";
import { exerciseInputSchema } from "@/lib/library/schema";

type RouteContext = { params: Promise<{ id: string }> };

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const coach = await requireCoachApi();
  if (!coach.ok) return coach.response;
  const parsed = exerciseInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Controlla i campi dell'esercizio." }, { status: 400 });
  const { id } = await context.params;
  try {
    await updateExercise(coach.userId, id, parsed.data);
    return NextResponse.json({ id });
  } catch (error) {
    if (error instanceof LibraryError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
