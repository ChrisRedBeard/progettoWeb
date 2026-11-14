import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isAppRole } from "@/lib/auth/roles";
import { liveDenialCopy } from "@/lib/live/contract";
import { issueLiveToken } from "@/lib/live/issue";

const bodySchema = z.object({
  scope: z.literal("lobby").optional(),
  sessionId: z.string().trim().min(1).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !isAppRole(role)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || (parsed.data.scope !== "lobby" && !parsed.data.sessionId)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const result = await issueLiveToken({
    userId: session.user.id,
    role,
    scope: parsed.data.scope === "lobby" ? "lobby" : "session",
    sessionId: parsed.data.sessionId,
  });
  if (!result.ok) {
    return NextResponse.json({ error: liveDenialCopy[result.reason], reason: result.reason }, { status: 403 });
  }
  return NextResponse.json(result.ticket);
}
