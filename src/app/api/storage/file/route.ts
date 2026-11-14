import { readSignedFile } from "@/lib/storage/local";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return readSignedFile(request, false);
}

export function HEAD(request: Request) {
  return readSignedFile(request, true);
}
