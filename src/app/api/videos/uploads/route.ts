import { NextResponse } from "next/server";
import { requireCoachApi } from "@/lib/auth/api-athlete";
import { LibraryError } from "@/lib/library/errors";
import { uploadRequestSchema } from "@/lib/library/schema";
import { beginUpload } from "@/lib/library/videos";
import { maxVideoBytes } from "@/lib/storage/limits";

export const runtime = "nodejs";

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const coach = await requireCoachApi();
  if (!coach.ok) return coach.response;
  const body = await readJson(request);
  if (body && typeof body === "object" && "sizeBytes" in body && typeof body.sizeBytes === "number" && body.sizeBytes > maxVideoBytes) {
    return NextResponse.json({ error: "Il video supera i 100 MB." }, { status: 413 });
  }
  const parsed = uploadRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Usa un file MP4 o WebM." }, { status: 400 });
  try {
    return NextResponse.json(await beginUpload(coach.userId, parsed.data));
  } catch (error) {
    if (error instanceof LibraryError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
