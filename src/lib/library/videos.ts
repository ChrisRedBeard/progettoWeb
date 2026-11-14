import { LibraryError } from "@/lib/library/errors";
import { prisma } from "@/lib/prisma";
import { maxVideoBytes, orphanUploadMs } from "@/lib/storage/limits";
import { videoMimes, videoSizeMessage, type VideoMime } from "@/lib/storage/media";
import { getStorage } from "@/lib/storage/provider";

async function coachProfile(coachUserId: string) {
  const profile = await prisma.coachProfile.findUnique({ where: { userId: coachUserId }, select: { id: true } });
  if (!profile) throw new LibraryError("Profilo non trovato.", 404);
  return profile;
}

export async function cleanupOrphanUploads(now = new Date()) {
  const cutoff = new Date(now.getTime() - orphanUploadMs);
  const rows = await prisma.videoUpload.findMany({
    where: { attachedAt: null, createdAt: { lt: cutoff } },
    select: { id: true, storageKey: true },
  });
  const storage = getStorage();
  for (const row of rows) {
    await storage.remove(row.storageKey);
    await prisma.videoUpload.delete({ where: { id: row.id } }).catch(() => undefined);
  }
  return rows.length;
}

export async function beginUpload(coachUserId: string, input: { mimeType: string; sizeBytes: number }) {
  if (!videoMimes.includes(input.mimeType as VideoMime)) throw new LibraryError("Usa un file MP4 o WebM.", 400);
  const sizeError = videoSizeMessage(input.sizeBytes);
  if (sizeError) throw new LibraryError(sizeError, input.sizeBytes > maxVideoBytes ? 413 : 400);
  await cleanupOrphanUploads();
  const profile = await coachProfile(coachUserId);
  const signed = await getStorage().createUpload({ contentType: input.mimeType, maxBytes: maxVideoBytes });
  const row = await prisma.videoUpload.create({
    data: { coachId: profile.id, storageKey: signed.storageKey, mimeType: input.mimeType, sizeBytes: input.sizeBytes },
  });
  return { uploadId: row.id, uploadUrl: signed.uploadUrl, expiresAt: signed.expiresAt };
}

export async function signedVideoUrl(input: { userId: string; role: "COACH" | "ATHLETE"; videoId: string }) {
  const video = await prisma.exerciseVideo.findUnique({
    where: { id: input.videoId },
    include: { exercise: { select: { visibility: true, coachId: true } } },
  });
  if (!video || video.storageKey.startsWith("placeholder:")) return null;
  if (!(await canReadExercise(input, video.exercise))) return null;
  return getStorage().createReadUrl(video.storageKey, video.mimeType ?? "video/mp4");
}

export async function canReadExercise(
  input: { userId: string; role: "COACH" | "ATHLETE" },
  exercise: { visibility: "PRIVATE" | "PUBLIC"; coachId: string | null },
) {
  if (exercise.visibility === "PUBLIC") return true;
  if (!exercise.coachId) return false;
  if (input.role === "COACH") {
    const profile = await prisma.coachProfile.findUnique({ where: { userId: input.userId }, select: { id: true } });
    return profile?.id === exercise.coachId;
  }
  const membership = await prisma.membership.findUnique({
    where: { athleteId: input.userId },
    select: { lobby: { select: { coachId: true } } },
  });
  return membership?.lobby.coachId === exercise.coachId;
}

export async function attachUpload(
  coachProfileId: string,
  exerciseId: string,
  kind: "EXPLANATION" | "EXECUTION",
  uploadId: string,
) {
  const previous = await prisma.$transaction(async (tx) => {
    const claimed = await tx.videoUpload.updateMany({
      where: { id: uploadId, coachId: coachProfileId, attachedAt: null },
      data: { attachedAt: new Date() },
    });
    if (claimed.count !== 1) throw new LibraryError("Il video non è più disponibile. Ricaricalo.", 400);
    const upload = await tx.videoUpload.findUniqueOrThrow({ where: { id: uploadId } });
    const existing = await tx.exerciseVideo.findUnique({ where: { exerciseId_kind: { exerciseId, kind } } });
    await tx.exerciseVideo.upsert({
      where: { exerciseId_kind: { exerciseId, kind } },
      create: {
        exerciseId,
        kind,
        storageKey: upload.storageKey,
        sizeBytes: upload.sizeBytes,
        mimeType: upload.mimeType,
      },
      update: { storageKey: upload.storageKey, sizeBytes: upload.sizeBytes, mimeType: upload.mimeType },
    });
    return existing?.storageKey ?? null;
  });
  if (previous && !previous.startsWith("placeholder:")) {
    const current = await prisma.exerciseVideo.findUnique({ where: { exerciseId_kind: { exerciseId, kind } } });
    if (current && previous !== current.storageKey) await getStorage().remove(previous);
  }
}
