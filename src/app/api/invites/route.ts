import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCoachApi } from "@/lib/auth/api-athlete";
import { createLobbyInvite, listLobbyInvites } from "@/lib/lobby/service";

const createInviteSchema = z.object({
  days: z.union([z.literal(1), z.literal(7), z.literal(30)]),
  email: z.string().trim().max(200).optional(),
});

export async function GET() {
  const coach = await requireCoachApi();
  if (!coach.ok) return coach.response;
  const invites = await listLobbyInvites(coach.userId);
  if (!invites) return NextResponse.json({ error: "Lobby non disponibile" }, { status: 404 });
  return NextResponse.json({ invites });
}

export async function POST(request: Request) {
  const coach = await requireCoachApi();
  if (!coach.ok) return coach.response;
  const parsed = createInviteSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  const email = parsed.data.email?.trim().toLowerCase() ?? "";
  if (email && !z.string().email().safeParse(email).success) {
    return NextResponse.json({ error: "Email non valida" }, { status: 400 });
  }
  const created = await createLobbyInvite({
    coachUserId: coach.userId,
    days: parsed.data.days,
    email: email || null,
  });
  if (!created) return NextResponse.json({ error: "Lobby non disponibile" }, { status: 404 });
  return NextResponse.json(created);
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
