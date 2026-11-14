import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCoachApi } from "@/lib/auth/api-athlete";
import { leaveLiveWatch } from "@/lib/live/issue";

const bodySchema = z.object({
  scope: z.literal("lobby").optional(),
  sessionId: z.string().trim().min(1).optional(),
});

export async function POST(request: Request) {
  const coach = await requireCoachApi();
  if (!coach.ok) return coach.response;
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || (parsed.data.scope !== "lobby" && !parsed.data.sessionId)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  if (parsed.data.scope === "lobby") leaveLiveWatch(coach.userId, { scope: "lobby" });
  else if (parsed.data.sessionId) leaveLiveWatch(coach.userId, { sessionId: parsed.data.sessionId });
  return new NextResponse(null, { status: 204 });
}
