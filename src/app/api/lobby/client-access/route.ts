import { NextResponse } from "next/server";
import { requireCoachApi } from "@/lib/auth/api-athlete";
import { loadClient } from "@/lib/lobby/service";

export async function GET(request: Request) {
  const coach = await requireCoachApi();
  if (!coach.ok) return coach.response;
  const athleteId = new URL(request.url).searchParams.get("athleteId")?.trim() ?? "";
  if (!athleteId) return new NextResponse(null, { status: 404 });
  const client = await loadClient(coach.userId, athleteId);
  if (!client) return new NextResponse(null, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
