import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAppRole } from "@/lib/auth/roles";

export async function requireCoachApi() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !isAppRole(role)) {
    return { ok: false as const, response: NextResponse.json({ error: "Non autorizzato" }, { status: 401 }) };
  }
  if (role !== "COACH") {
    return { ok: false as const, response: NextResponse.json({ error: "Non autorizzato" }, { status: 403 }) };
  }
  return { ok: true as const, userId: session.user.id, name: session.user.name ?? "Coach" };
}

export async function requireAthleteApi() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !isAppRole(role)) {
    return { ok: false as const, response: NextResponse.json({ error: "Non autorizzato" }, { status: 401 }) };
  }
  if (role !== "ATHLETE") {
    return { ok: false as const, response: NextResponse.json({ error: "Non autorizzato" }, { status: 403 }) };
  }
  return { ok: true as const, userId: session.user.id };
}
