import { NextResponse } from "next/server";
import { requireAthleteApi } from "@/lib/auth/api-athlete";
import { leaveCoach } from "@/lib/lobby/service";

export async function POST() {
  const athlete = await requireAthleteApi();
  if (!athlete.ok) return athlete.response;
  const left = await leaveCoach(athlete.userId);
  if (!left) return NextResponse.json({ error: "Nessun coach" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
