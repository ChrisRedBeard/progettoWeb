import { LibraryError } from "@/lib/library/errors";
import type { ExerciseInput } from "@/lib/library/schema";
import { playableVideoId } from "@/lib/library/schema";
import { attachUpload, cleanupOrphanUploads } from "@/lib/library/videos";
import { prisma } from "@/lib/prisma";

const analysisLabels = {
  NONE: "Senza analisi del movimento",
  CATALOG: "Analisi del catalogo",
  GENERIC: "Analisi generica",
} as const;

async function ownProfile(coachUserId: string) {
  const profile = await prisma.coachProfile.findUnique({ where: { userId: coachUserId }, select: { id: true } });
  if (!profile) throw new LibraryError("Profilo non trovato.", 404);
  return profile;
}

function assertPublic(input: ExerciseInput) {
  if (input.visibility === "PUBLIC" && input.confirmPublic !== true) {
    throw new LibraryError("Per renderlo pubblico conferma che sarà visibile a chi non ha un coach.", 400);
  }
}

function toView(
  exercise: {
    id: string;
    title: string;
    description: string | null;
    visibility: "PRIVATE" | "PUBLIC";
    analysisType: keyof typeof analysisLabels;
    defaultSets: number;
    defaultReps: number;
    defaultTempo: string | null;
    defaultRestSeconds: number;
    archivedAt: Date | null;
    coachId: string | null;
    videos: { id: string; kind: "EXPLANATION" | "EXECUTION"; storageKey: string }[];
  },
  readOnly: boolean,
) {
  const explanation = exercise.videos.find((video) => video.kind === "EXPLANATION");
  const execution = exercise.videos.find((video) => video.kind === "EXECUTION");
  return {
    id: exercise.id,
    title: exercise.title,
    description: exercise.description ?? "",
    visibility: exercise.visibility,
    analysisLabel: analysisLabels[exercise.analysisType],
    defaultSets: exercise.defaultSets,
    defaultReps: exercise.defaultReps,
    defaultTempo: exercise.defaultTempo ?? "",
    defaultRestSeconds: exercise.defaultRestSeconds,
    archived: exercise.archivedAt !== null,
    readOnly,
    explanationVideoId: playableVideoId(explanation),
    executionVideoId: playableVideoId(execution),
  };
}

export async function listLibrary(coachUserId: string) {
  const profile = await prisma.coachProfile.findUnique({ where: { userId: coachUserId }, select: { id: true } });
  if (!profile) return null;
  await cleanupOrphanUploads();
  const rows = await prisma.exercise.findMany({
    where: { OR: [{ coachId: profile.id }, { coachId: null, visibility: "PUBLIC" }] },
    orderBy: { title: "asc" },
    select: { id: true, title: true, visibility: true, coachId: true, archivedAt: true, defaultSets: true, defaultReps: true },
  });
  const card = (row: (typeof rows)[number]) => ({
    id: row.id,
    title: row.title,
    visibility: row.visibility,
    sets: row.defaultSets,
    reps: row.defaultReps,
    readOnly: row.coachId === null,
  });
  return {
    own: rows.filter((row) => row.coachId === profile.id && !row.archivedAt).map(card),
    archived: rows.filter((row) => row.coachId === profile.id && row.archivedAt).map(card),
    catalog: rows.filter((row) => row.coachId === null).map(card),
  };
}

export async function getCoachExercise(coachUserId: string, exerciseId: string) {
  const profile = await ownProfile(coachUserId);
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    include: { videos: { select: { id: true, kind: true, storageKey: true } } },
  });
  if (!exercise) return null;
  if (exercise.coachId === null && exercise.visibility === "PUBLIC") return toView(exercise, true);
  if (exercise.coachId !== profile.id) return null;
  return toView(exercise, false);
}

export async function addableExercises(coachUserId: string) {
  const profile = await prisma.coachProfile.findUnique({ where: { userId: coachUserId }, select: { id: true } });
  if (!profile) return null;
  const rows = await prisma.exercise.findMany({
    where: {
      archivedAt: null,
      OR: [{ coachId: profile.id }, { coachId: null, visibility: "PUBLIC" }],
    },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      defaultSets: true,
      defaultReps: true,
      defaultTempo: true,
      defaultRestSeconds: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    sets: row.defaultSets,
    reps: row.defaultReps,
    tempo: row.defaultTempo ?? "",
    restSeconds: row.defaultRestSeconds,
  }));
}

async function writeExercise(coachProfileId: string, exerciseId: string, input: ExerciseInput) {
  if (input.explanationUploadId) await attachUpload(coachProfileId, exerciseId, "EXPLANATION", input.explanationUploadId);
  if (input.executionUploadId) await attachUpload(coachProfileId, exerciseId, "EXECUTION", input.executionUploadId);
}

export async function createExercise(coachUserId: string, input: ExerciseInput) {
  assertPublic(input);
  const profile = await ownProfile(coachUserId);
  const exercise = await prisma.exercise.create({
    data: {
      coachId: profile.id,
      title: input.title,
      description: emptyToNull(input.description),
      visibility: input.visibility,
      analysisType: "NONE",
      analysisKey: null,
      defaultSets: input.defaultSets,
      defaultReps: input.defaultReps,
      defaultTempo: emptyToNull(input.defaultTempo),
      defaultRestSeconds: input.defaultRestSeconds,
    },
  });
  await writeExercise(profile.id, exercise.id, input);
  return exercise.id;
}

export async function updateExercise(coachUserId: string, exerciseId: string, input: ExerciseInput) {
  assertPublic(input);
  const profile = await ownProfile(coachUserId);
  const owned = await prisma.exercise.findFirst({ where: { id: exerciseId, coachId: profile.id }, select: { id: true } });
  if (!owned) throw new LibraryError("Esercizio non trovato.", 404);
  await prisma.exercise.update({
    where: { id: exerciseId },
    data: {
      title: input.title,
      description: emptyToNull(input.description),
      visibility: input.visibility,
      analysisType: "NONE",
      analysisKey: null,
      defaultSets: input.defaultSets,
      defaultReps: input.defaultReps,
      defaultTempo: emptyToNull(input.defaultTempo),
      defaultRestSeconds: input.defaultRestSeconds,
    },
  });
  await writeExercise(profile.id, exerciseId, input);
}

export async function archiveExercise(coachUserId: string, exerciseId: string) {
  const profile = await ownProfile(coachUserId);
  const updated = await prisma.exercise.updateMany({
    where: { id: exerciseId, coachId: profile.id, archivedAt: null },
    data: { archivedAt: new Date() },
  });
  if (updated.count !== 1) throw new LibraryError("Esercizio non trovato.", 404);
}

function emptyToNull(value: string | null | undefined) {
  const text = value?.trim();
  return text ? text : null;
}
