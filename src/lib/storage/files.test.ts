import { afterAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/storage/file/route";
import { localStorageProvider, videoFilePath, writeSignedUpload } from "@/lib/storage/local";
import { maxVideoBytes } from "@/lib/storage/limits";
import { signClaims } from "@/lib/storage/sign";
import { rm } from "node:fs/promises";

const keys: string[] = [];

function mp4(size = 32) {
  const bytes = Buffer.alloc(size);
  bytes.write("ftyp", 4, "ascii");
  return bytes;
}

describe("local video files", () => {
  afterAll(async () => {
    for (const key of keys) {
      const file = videoFilePath(key);
      if (file) await rm(file, { force: true });
    }
  });

  it("rejects size and type on the server and keeps a valid MP4 or WebM", async () => {
    const wrong = await localStorageProvider.createUpload({ contentType: "video/mp4", maxBytes: maxVideoBytes });
    keys.push(wrong.storageKey);
    const text = await writeSignedUpload(
      new Request(`http://local${wrong.uploadUrl}`, {
        method: "PUT",
        body: Buffer.from("questo non e un video, ma e lungo abbastanza"),
      }),
    );
    expect(text).toMatchObject({ ok: false, status: 400 });

    const capped = await localStorageProvider.createUpload({ contentType: "video/mp4", maxBytes: 8 });
    keys.push(capped.storageKey);
    const over = await writeSignedUpload(new Request(`http://local${capped.uploadUrl}`, { method: "PUT", body: mp4(40) }));
    expect(over).toMatchObject({ ok: false, status: 413 });

    const good = await localStorageProvider.createUpload({ contentType: "video/webm", maxBytes: 64 });
    keys.push(good.storageKey);
    const webm = Buffer.alloc(16);
    webm.set([0x1a, 0x45, 0xdf, 0xa3], 0);
    const saved = await writeSignedUpload(new Request(`http://local${good.uploadUrl}`, { method: "PUT", body: webm }));
    expect(saved).toMatchObject({ ok: true, mimeType: "video/webm" });
  });

  it("serves a byte range with 206 and Accept-Ranges", async () => {
    const upload = await localStorageProvider.createUpload({ contentType: "video/mp4", maxBytes: 64 });
    keys.push(upload.storageKey);
    const saved = await writeSignedUpload(new Request(`http://local${upload.uploadUrl}`, { method: "PUT", body: mp4(20) }));
    expect(saved.ok).toBe(true);
    const read = await localStorageProvider.createReadUrl(upload.storageKey, "video/mp4");
    const partial = await GET(new Request(`http://local${read.url}`, { headers: { range: "bytes=4-7" } }));
    expect(partial.status).toBe(206);
    expect(partial.headers.get("accept-ranges")).toBe("bytes");
    expect(partial.headers.get("content-range")).toBe("bytes 4-7/20");
    expect(new TextDecoder().decode(await partial.arrayBuffer())).toBe("ftyp");

    const whole = await GET(new Request(`http://local${read.url}`));
    expect(whole.status).toBe(200);
    expect(whole.headers.get("accept-ranges")).toBe("bytes");
    expect(Number(whole.headers.get("content-length"))).toBe(20);

    const missing = await GET(new Request(`http://local${read.url}`, { headers: { range: "bytes=40-50" } }));
    expect(missing.status).toBe(416);
  });

  it("hides an expired signature", async () => {
    const token = signClaims({ purpose: "read", key: `v_${"ab".repeat(16)}`, exp: Date.now() - 1000, mime: "video/mp4" });
    const response = await GET(new Request(`http://local/api/storage/file?token=${encodeURIComponent(token)}`));
    expect(response.status).toBe(404);
  });
});
