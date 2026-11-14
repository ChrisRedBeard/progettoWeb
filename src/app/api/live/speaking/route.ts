import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCoachApi } from "@/lib/auth/api-athlete";
import { setLiveSpeaking } from "@/lib/live/issue";

const bodySchema = z.object({
  sessionId: z.string().trim().min(1),
  speaking: z.boolean(),
});

export async function POST(request: Request) {
  const coach = await requireCoachApi();
  if (!coach.ok) return coach.response;
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  const saved = setLiveSpeaking(coach.userId, parsed.data.sessionId, parsed.data.speaking);
  if (!saved) return NextResponse.json({ error: "Non puoi parlare in questa diretta." }, { status: 403 });
  return new NextResponse(null, { status: 204 });
}
