import { NextResponse } from "next/server";
import { requireCoachApi } from "@/lib/auth/api-athlete";
import { archiveExercise } from "@/lib/library/exercises";
import { LibraryError } from "@/lib/library/errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const coach = await requireCoachApi();
  if (!coach.ok) return coach.response;
  const { id } = await context.params;
  try {
    await archiveExercise(coach.userId, id);
    return NextResponse.json({ id });
  } catch (error) {
    if (error instanceof LibraryError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
