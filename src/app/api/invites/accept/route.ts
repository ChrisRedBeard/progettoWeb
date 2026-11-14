import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAthleteApi } from "@/lib/auth/api-athlete";
import { acceptInvite } from "@/lib/lobby/service";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  token: z.string().min(20).max(200),
  leaveCurrent: z.boolean(),
});

export async function POST(request: Request) {
  const athlete = await requireAthleteApi();
  if (!athlete.ok) return athlete.response;
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: athlete.userId },
    select: { email: true },
  });
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const result = await acceptInvite({
    token: parsed.data.token,
    athleteId: athlete.userId,
    athleteEmail: user.email,
    leaveCurrent: parsed.data.leaveCurrent,
  });
  if (!result.ok) return NextResponse.json(result, { status: result.reason === "other_coach" ? 409 : 400 });
  return NextResponse.json(result);
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
