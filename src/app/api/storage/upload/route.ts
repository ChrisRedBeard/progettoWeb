import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeSignedUpload } from "@/lib/storage/local";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const result = await writeSignedUpload(request);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  await prisma.videoUpload.updateMany({
    where: { storageKey: result.storageKey },
    data: { sizeBytes: result.sizeBytes, mimeType: result.mimeType },
  });
  return NextResponse.json({ ok: true, sizeBytes: result.sizeBytes });
}
