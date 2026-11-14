import { randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, open, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { maxVideoBytes, readUrlTtlMs, uploadUrlTtlMs } from "@/lib/storage/limits";
import { sniffVideo, type VideoMime } from "@/lib/storage/media";
import { fileResponse } from "@/lib/storage/range";
import { signClaims, verifyClaims } from "@/lib/storage/sign";
import type { StorageProvider } from "@/lib/storage/types";

const root = path.join(process.cwd(), "data", "videos");

export function videoFilePath(storageKey: string) {
  if (!/^v_[a-f0-9]{32}$/.test(storageKey)) return null;
  const resolved = path.resolve(root, storageKey);
  if (!resolved.startsWith(path.resolve(root))) return null;
  return resolved;
}

async function writeAll(handle: Awaited<ReturnType<typeof open>>, chunk: Uint8Array) {
  let offset = 0;
  while (offset < chunk.byteLength) {
    const { bytesWritten } = await handle.write(chunk, offset, chunk.byteLength - offset);
    if (bytesWritten <= 0) break;
    offset += bytesWritten;
  }
}

function declaredTooBig(header: string | null, max: number) {
  if (!header) return false;
  const size = Number(header);
  return Number.isFinite(size) && size > max;
}

export const localStorageProvider: StorageProvider = {
  async createUpload({ contentType, maxBytes }) {
    const storageKey = `v_${randomBytes(16).toString("hex")}`;
    const exp = Date.now() + uploadUrlTtlMs;
    const token = signClaims({ purpose: "upload", key: storageKey, exp, mime: contentType, max: maxBytes });
    return {
      storageKey,
      uploadUrl: `/api/storage/upload?token=${encodeURIComponent(token)}`,
      expiresAt: new Date(exp).toISOString(),
    };
  },
  async createReadUrl(storageKey, contentType) {
    const exp = Date.now() + readUrlTtlMs;
    const token = signClaims({ purpose: "read", key: storageKey, exp, mime: contentType });
    return { url: `/api/storage/file?token=${encodeURIComponent(token)}`, expiresAt: new Date(exp).toISOString() };
  },
  async remove(storageKey) {
    const file = videoFilePath(storageKey);
    if (!file) return;
    await rm(file, { force: true });
  },
};

export async function writeSignedUpload(request: Request): Promise<
  | { ok: true; storageKey: string; sizeBytes: number; mimeType: VideoMime }
  | { ok: false; status: number; error: string }
> {
  const token = new URL(request.url).searchParams.get("token");
  const claims = token ? verifyClaims(token) : null;
  if (!claims || claims.purpose !== "upload") return { ok: false, status: 404, error: "Upload non valido." };
  const max = Math.min(claims.max ?? maxVideoBytes, maxVideoBytes);
  if (declaredTooBig(request.headers.get("content-length"), max)) return { ok: false, status: 413, error: "Il video supera i 100 MB." };
  if (!request.body) return { ok: false, status: 400, error: "File mancante." };
  const destination = videoFilePath(claims.key);
  if (!destination) return { ok: false, status: 404, error: "Upload non valido." };

  await mkdir(root, { recursive: true });
  const handle = await open(destination, "w");
  const reader = request.body.getReader();
  let size = 0;
  let sniffed: VideoMime | null = null;
  let header = Buffer.alloc(0);
  const fail = async (status: number, error: string) => {
    await reader.cancel().catch(() => undefined);
    await handle.close().catch(() => undefined);
    await rm(destination, { force: true });
    return { ok: false as const, status, error };
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      size += value.byteLength;
      if (size > max) return fail(413, "Il video supera i 100 MB.");
      if (!sniffed) {
        header = Buffer.concat([header, Buffer.from(value)]);
        if (header.length < 16) continue;
        sniffed = sniffVideo(header);
        if (!sniffed || (claims.mime && sniffed !== claims.mime)) {
          return fail(400, "Il file non è un video MP4 o WebM.");
        }
        await writeAll(handle, header);
        header = Buffer.alloc(0);
        continue;
      }
      await writeAll(handle, value);
    }
  } catch {
    return fail(400, "Caricamento interrotto.");
  }
  await handle.close();
  if (!sniffed || size === 0) {
    await rm(destination, { force: true });
    return { ok: false, status: 400, error: "Il file non è un video MP4 o WebM." };
  }
  return { ok: true, storageKey: claims.key, sizeBytes: size, mimeType: sniffed };
}

export async function readSignedFile(request: Request, head = false) {
  const token = new URL(request.url).searchParams.get("token");
  const claims = token ? verifyClaims(token) : null;
  if (!claims || claims.purpose !== "read") return new Response(null, { status: 404 });
  const destination = videoFilePath(claims.key);
  if (!destination) return new Response(null, { status: 404 });
  try {
    const info = await stat(destination);
    return fileResponse({
      size: info.size,
      mime: claims.mime || "application/octet-stream",
      range: request.headers.get("range"),
      head,
      open: (start, end) => Readable.toWeb(createReadStream(destination, { start, end })) as ReadableStream,
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
