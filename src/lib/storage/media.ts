import { maxVideoBytes, maxVideoSeconds } from "@/lib/storage/limits";

export const videoMimes = ["video/mp4", "video/webm"] as const;
export type VideoMime = (typeof videoMimes)[number];

export function sniffVideo(bytes: Uint8Array): VideoMime | null {
  if (bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    return "video/mp4";
  }
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "video/webm";
  }
  return null;
}

export function declaredVideoMime(file: { type: string; name: string }): VideoMime | null {
  if (file.type === "video/mp4" || file.type === "video/webm") return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".mp4")) return "video/mp4";
  if (name.endsWith(".webm")) return "video/webm";
  return null;
}

export function videoSizeMessage(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "Scegli un file video.";
  if (size > maxVideoBytes) return "Il video supera i 100 MB.";
  return null;
}

export function videoDurationMessage(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "Il browser non riesce a leggere questo video. Esportalo in MP4 con H.264 e riprova.";
  }
  if (seconds > maxVideoSeconds) return "Il video supera i 3 minuti.";
  return null;
}
