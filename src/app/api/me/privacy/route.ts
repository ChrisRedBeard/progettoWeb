import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAthleteApi } from "@/lib/auth/api-athlete";
import { setPrivateLive } from "@/lib/lobby/service";

const bodySchema = z.object({ privateLive: z.boolean() });

export async function POST(request: Request) {
  const athlete = await requireAthleteApi();
  if (!athlete.ok) return athlete.response;
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  const saved = await setPrivateLive(athlete.userId, parsed.data.privateLive);
  if (!saved) return NextResponse.json({ error: "Nessun coach" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
