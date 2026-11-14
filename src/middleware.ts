import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { decideAccess, devRoutesAllowed, roleFromSession } from "@/lib/auth/routes";

const { auth } = NextAuth(authConfig);

export default auth(async (request) => {
  const { pathname } = request.nextUrl;
  const role = roleFromSession(request.auth?.user?.role);
  const decision = decideAccess(pathname, role, {
    allowDevRoutes: devRoutesAllowed(),
    callbackUrl: request.nextUrl.searchParams.get("callbackUrl"),
  });

  if (decision.type === "allow") {
    const missingClient = await missingClientSheet(request, role);
    if (missingClient) return missingClient;
    return NextResponse.next();
  }
  if (decision.type === "notFound") return new NextResponse(null, { status: 404 });

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(new URL(decision.to, request.nextUrl));
});

async function missingClientSheet(request: { nextUrl: URL; headers: Headers }, role: "COACH" | "ATHLETE" | null) {
  if (role !== "COACH") return null;
  const match = request.nextUrl.pathname.match(/^\/clients\/([^/]+)$/);
  if (!match?.[1]) return null;
  const url = new URL("/api/lobby/client-access", request.nextUrl.origin);
  url.searchParams.set("athleteId", match[1]);
  try {
    const response = await fetch(url, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    if (response.status !== 404) return null;
  } catch {
    return null;
  }
  return new NextResponse(
    `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>FIT AI</title></head><body><main><h1>Pagina non trovata</h1><p>Questo indirizzo non corrisponde a una schermata di FIT AI.</p></main></body></html>`,
    { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/storage|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
