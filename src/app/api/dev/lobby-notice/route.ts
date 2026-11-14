import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCoachApi } from "@/lib/auth/api-athlete";
import { devRoutesAllowed } from "@/lib/auth/routes";
import { publishLobbyEvent } from "@/lib/lobby/bus";

const bodySchema = z.object({
  type: z.enum(["sessionStarted", "sessionEnded", "privacyChanged"]),
  privateLive: z.boolean().optional(),
});

export async function POST(request: Request) {
  if (!devRoutesAllowed()) return new NextResponse(null, { status: 404 });
  const coach = await requireCoachApi();
  if (!coach.ok) return coach.response;
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  const at = new Date().toISOString();
  if (parsed.data.type === "privacyChanged") {
    publishLobbyEvent(coach.userId, {
      type: "privacyChanged",
      athleteId: "debug-athlete",
      athleteName: "Atleta di prova",
      privateLive: parsed.data.privateLive === true,
      at,
    });
  } else if (parsed.data.type === "sessionEnded") {
    publishLobbyEvent(coach.userId, { type: "sessionEnded", sessionId: "debug-session", athleteId: "debug-athlete", at });
  } else {
    publishLobbyEvent(coach.userId, {
      type: "sessionStarted",
      sessionId: "debug-session",
      athleteId: "debug-athlete",
      athleteName: "Atleta di prova",
      live: true,
      at,
    });
  }
  return NextResponse.json({ ok: true });
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
