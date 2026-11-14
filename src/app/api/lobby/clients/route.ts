import { NextResponse } from "next/server";
import { requireCoachApi } from "@/lib/auth/api-athlete";
import { lobbyReadDecision } from "@/lib/lobby/events";
import { loadRoster } from "@/lib/lobby/service";
import { auth } from "@/auth";
import { isAppRole } from "@/lib/auth/roles";

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !isAppRole(role)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (lobbyReadDecision(role) !== "allow") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const coach = await requireCoachApi();
  if (!coach.ok) return coach.response;
  const athletes = await loadRoster(coach.userId);
  if (!athletes) return NextResponse.json({ error: "Lobby non disponibile" }, { status: 404 });
  return NextResponse.json({ athletes });
}
