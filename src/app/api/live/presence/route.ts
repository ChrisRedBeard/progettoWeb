import { NextResponse } from "next/server";
import { requireAthleteApi } from "@/lib/auth/api-athlete";
import { readLivePresence } from "@/lib/live/issue";

export async function GET(request: Request) {
  const athlete = await requireAthleteApi();
  if (!athlete.ok) return athlete.response;
  const sessionId = new URL(request.url).searchParams.get("sessionId")?.trim() ?? "";
  if (!sessionId) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  const presence = await readLivePresence(athlete.userId, sessionId);
  if (!presence) return new NextResponse(null, { status: 404 });
  return NextResponse.json(presence);
}
