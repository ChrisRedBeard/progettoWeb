import { NextResponse } from "next/server";
import { requireAthleteApi } from "@/lib/auth/api-athlete";
import { prisma } from "@/lib/prisma";
import { consentBodySchema } from "@/lib/validators/training";

export async function POST(request: Request) {
  const athlete = await requireAthleteApi();
  if (!athlete.ok) return athlete.response;

  const parsed = consentBodySchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  await prisma.user.update({
    where: { id: athlete.userId },
    data: { consentAt: new Date(), consentVersion: parsed.data.version },
  });
  return NextResponse.json({ ok: true });
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
