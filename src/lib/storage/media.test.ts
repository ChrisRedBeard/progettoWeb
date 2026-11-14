import { describe, expect, it } from "vitest";
import { maxVideoBytes, maxVideoSeconds } from "@/lib/storage/limits";
import { declaredVideoMime, sniffVideo, videoDurationMessage, videoSizeMessage } from "@/lib/storage/media";

describe("video limits", () => {
  it("reads the file header instead of the extension", () => {
    const mp4 = new Uint8Array(16);
    mp4[4] = 0x66;
    mp4[5] = 0x74;
    mp4[6] = 0x79;
    mp4[7] = 0x70;
    expect(sniffVideo(mp4)).toBe("video/mp4");
    expect(sniffVideo(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]))).toBe("video/webm");
    expect(sniffVideo(new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x00, 0x00, 0x00, 0x00]))).toBeNull();
    expect(declaredVideoMime({ type: "", name: "clip.mp4" })).toBe("video/mp4");
    expect(declaredVideoMime({ type: "video/quicktime", name: "clip.mov" })).toBeNull();
  });

  it("rejects more than 100 MB or 3 minutes, and explains an unreadable file", () => {
    expect(videoSizeMessage(maxVideoBytes)).toBeNull();
    expect(videoSizeMessage(maxVideoBytes + 1)).toBe("Il video supera i 100 MB.");
    expect(videoDurationMessage(maxVideoSeconds)).toBeNull();
    expect(videoDurationMessage(maxVideoSeconds + 1)).toBe("Il video supera i 3 minuti.");
    expect(videoDurationMessage(Number.NaN)).toContain("H.264");
  });
});
