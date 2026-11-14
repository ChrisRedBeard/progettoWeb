import { NextResponse } from "next/server";
import { requireCoachApi } from "@/lib/auth/api-athlete";
import { revokeLobbyInvite } from "@/lib/lobby/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const coach = await requireCoachApi();
  if (!coach.ok) return coach.response;
  const { id } = await context.params;
  const revoked = await revokeLobbyInvite(coach.userId, id);
  if (!revoked) return NextResponse.json({ error: "Invito non revocabile" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
