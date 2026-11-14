import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAppRole } from "@/lib/auth/roles";
import { signedVideoUrl } from "@/lib/library/videos";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !isAppRole(role)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const { id } = await context.params;
  const signed = await signedVideoUrl({ userId: session.user.id, role, videoId: id });
  if (!signed) return NextResponse.json({ error: "Video non trovato." }, { status: 404 });
  return NextResponse.json(signed);
}
