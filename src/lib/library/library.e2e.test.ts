import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PUT } from "@/app/api/storage/upload/route";
import { archiveExercise, createExercise } from "@/lib/library/exercises";
import { LibraryError } from "@/lib/library/errors";
import { beginUpload, cleanupOrphanUploads, signedVideoUrl } from "@/lib/library/videos";
import { assignWorkout, closeAssignment, createWorkout, saveWorkout } from "@/lib/library/workouts";
import { openTrainingSession } from "@/lib/lobby/service";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage/provider";

const suffix = randomBytes(4).toString("hex");

describe("library, videos and assignments", () => {
  const ids = { users: [] as string[], exercises: [] as string[], workouts: [] as string[], profiles: [] as string[] };
  let coachA: { userId: string; profileId: string; lobbyId: string };
  let coachB: { userId: string; profileId: string; lobbyId: string };
  let athleteInId = "";
  let athleteOutId = "";

  beforeAll(async () => {
    coachA = await createCoach(`fase6-a-${suffix}@fitai.local`, "Coach A");
    coachB = await createCoach(`fase6-b-${suffix}@fitai.local`, "Coach B");
    const athleteIn = await prisma.user.create({
      data: { email: `fase6-in-${suffix}@fitai.local`, name: "Giulia Prova", role: "ATHLETE", passwordHash: "unused" },
    });
    const athleteOut = await prisma.user.create({
      data: { email: `fase6-out-${suffix}@fitai.local`, name: "Marco Altro", role: "ATHLETE", passwordHash: "unused" },
    });
    athleteInId = athleteIn.id;
    athleteOutId = athleteOut.id;
    ids.users.push(coachA.userId, coachB.userId, athleteIn.id, athleteOut.id);
    ids.profiles.push(coachA.profileId, coachB.profileId);
    await prisma.membership.create({ data: { lobbyId: coachA.lobbyId, athleteId: athleteIn.id } });
    await prisma.membership.create({ data: { lobbyId: coachB.lobbyId, athleteId: athleteOut.id } });
  });

  afterAll(async () => {
    const videos = await prisma.exerciseVideo.findMany({
      where: { exerciseId: { in: ids.exercises } },
      select: { storageKey: true },
    });
    const uploads = await prisma.videoUpload.findMany({
      where: { coachId: { in: ids.profiles } },
      select: { storageKey: true },
    });
    const storage = getStorage();
    for (const row of [...videos, ...uploads]) {
      if (!row.storageKey.startsWith("placeholder:")) await storage.remove(row.storageKey);
    }
    await prisma.setResult.deleteMany({ where: { session: { athleteId: { in: ids.users } } } });
    await prisma.workoutSession.deleteMany({ where: { athleteId: { in: ids.users } } });
    await prisma.workoutAssignment.deleteMany({ where: { athleteId: { in: ids.users } } });
    if (ids.workouts.length > 0) {
      await prisma.workoutExercise.deleteMany({ where: { workoutId: { in: ids.workouts } } });
      await prisma.workout.deleteMany({ where: { id: { in: ids.workouts } } });
    }
    if (ids.exercises.length > 0) {
      await prisma.exerciseVideo.deleteMany({ where: { exerciseId: { in: ids.exercises } } });
      await prisma.exercise.deleteMany({ where: { id: { in: ids.exercises } } });
    }
    await prisma.videoUpload.deleteMany({ where: { coachId: { in: ids.profiles } } });
    await prisma.membership.deleteMany({ where: { athleteId: { in: ids.users } } });
    await prisma.lobby.deleteMany({ where: { coachId: { in: ids.profiles } } });
    await prisma.coachProfile.deleteMany({ where: { id: { in: ids.profiles } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.$disconnect();
  });

  it("hides a private video and serves a public one", async () => {
    const exerciseId = await createExercise(coachA.userId, draft("Privato", "PRIVATE"));
    ids.exercises.push(exerciseId);
    const video = await prisma.exerciseVideo.create({
      data: { exerciseId, kind: "EXPLANATION", storageKey: `v_${randomBytes(16).toString("hex")}`, mimeType: "video/mp4" },
    });
    const placeholder = await prisma.exerciseVideo.create({
      data: { exerciseId, kind: "EXECUTION", storageKey: "placeholder://execution" },
    });
    expect(await signedVideoUrl({ userId: coachB.userId, role: "COACH", videoId: video.id })).toBeNull();
    expect(await signedVideoUrl({ userId: athleteOutId, role: "ATHLETE", videoId: video.id })).toBeNull();
    expect(await signedVideoUrl({ userId: athleteInId, role: "ATHLETE", videoId: video.id })).toMatchObject({ url: expect.stringContaining("/api/storage/file") });
    expect(await signedVideoUrl({ userId: coachA.userId, role: "COACH", videoId: placeholder.id })).toBeNull();

    await expect(createExercise(coachA.userId, draft("Aperto", "PUBLIC"))).rejects.toBeInstanceOf(LibraryError);
    const publicId = await createExercise(coachA.userId, { ...draft("Aperto", "PUBLIC"), confirmPublic: true });
    ids.exercises.push(publicId);
    const created = await prisma.exercise.findUnique({ where: { id: publicId } });
    expect(created?.analysisType).toBe("NONE");
    const publicVideo = await prisma.exerciseVideo.create({
      data: { exerciseId: publicId, kind: "EXPLANATION", storageKey: `v_${randomBytes(16).toString("hex")}`, mimeType: "video/mp4" },
    });
    expect(await signedVideoUrl({ userId: athleteOutId, role: "ATHLETE", videoId: publicVideo.id })).not.toBeNull();
  });

  it("archives a used exercise without deleting it, and refuses to add it again", async () => {
    const exerciseId = await createExercise(coachA.userId, draft("Usato", "PRIVATE"));
    ids.exercises.push(exerciseId);
    const workoutId = await createWorkout(coachA.userId, "Scheda archivio");
    ids.workouts.push(workoutId);
    await saveWorkout(coachA.userId, workoutId, { title: "Scheda archivio", exercises: [line(exerciseId)] });
    await archiveExercise(coachA.userId, exerciseId);
    const stored = await prisma.exercise.findUnique({ where: { id: exerciseId } });
    expect(stored?.archivedAt).not.toBeNull();
    expect(await prisma.workoutExercise.count({ where: { workoutId, exerciseId } })).toBe(1);
    const otherId = await createWorkout(coachA.userId, "Scheda nuova");
    ids.workouts.push(otherId);
    await expect(
      saveWorkout(coachA.userId, otherId, { title: "Scheda nuova", exercises: [line(exerciseId)] }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("keeps history when a performed exercise is removed and keeps an open session intact", async () => {
    const exerciseId = await createExercise(coachA.userId, draft("Storico", "PRIVATE"));
    ids.exercises.push(exerciseId);
    const workoutId = await createWorkout(coachA.userId, "Scheda storico");
    ids.workouts.push(workoutId);
    const saved = await saveWorkout(coachA.userId, workoutId, { title: "Scheda storico", exercises: [line(exerciseId)] });
    const rowId = saved.exercises[0]?.id;
    if (!rowId) throw new Error("riga mancante");
    const assignment = await prisma.workoutAssignment.create({ data: { workoutId, athleteId: athleteInId, active: true } });
    const sessionId = await openTrainingSession({
      athleteId: athleteInId,
      exerciseId,
      assignmentId: assignment.id,
      feedbackMode: "FULL",
    });
    await prisma.setResult.create({
      data: { sessionId, workoutExerciseId: rowId, exerciseId, setNumber: 1, repsDone: 8 },
    });
    await saveWorkout(coachA.userId, workoutId, { title: "Scheda storico", exercises: [] });
    const parked = await prisma.workoutExercise.findUnique({ where: { id: rowId } });
    expect(parked?.removedAt).not.toBeNull();
    expect(parked?.position).toBeLessThan(0);
    expect(await prisma.setResult.findFirst({ where: { workoutExerciseId: rowId } })).not.toBeNull();

    const freshId = await createExercise(coachA.userId, draft("In corso", "PRIVATE"));
    ids.exercises.push(freshId);
    const liveWorkout = await createWorkout(coachA.userId, "Scheda aperta");
    ids.workouts.push(liveWorkout);
    const live = await saveWorkout(coachA.userId, liveWorkout, { title: "Scheda aperta", exercises: [line(freshId)] });
    const liveRow = live.exercises[0]?.id;
    if (!liveRow) throw new Error("riga mancante");
    const liveAssignment = await prisma.workoutAssignment.create({ data: { workoutId: liveWorkout, athleteId: athleteOutId, active: true } });
    await prisma.workoutSession.create({
      data: { athleteId: athleteOutId, assignmentId: liveAssignment.id, status: "IN_PROGRESS", currentExerciseId: freshId, lastSeenAt: new Date() },
    });
    await saveWorkout(coachA.userId, liveWorkout, { title: "Scheda aperta", exercises: [] });
    expect((await prisma.workoutExercise.findUnique({ where: { id: liveRow } }))?.removedAt).not.toBeNull();
  });

  it("closes the previous assignment and rejects another coach's athlete", async () => {
    await prisma.workoutAssignment.updateMany({ where: { athleteId: athleteInId, active: true }, data: { active: false } });
    const firstId = await createWorkout(coachA.userId, "Prima scheda");
    const secondId = await createWorkout(coachA.userId, "Seconda scheda");
    ids.workouts.push(firstId, secondId);
    expect((await assignWorkout({ coachUserId: coachA.userId, workoutId: firstId, athleteIds: [athleteInId], confirmClose: false })).ok).toBe(true);
    const blocked = await assignWorkout({ coachUserId: coachA.userId, workoutId: secondId, athleteIds: [athleteInId], confirmClose: false });
    expect(blocked).toMatchObject({ ok: false, closing: [expect.objectContaining({ workoutTitle: "Prima scheda", athleteName: "Giulia Prova" })] });
    expect(await prisma.workoutAssignment.count({ where: { athleteId: athleteInId, workoutId: firstId, active: true } })).toBe(1);
    expect((await assignWorkout({ coachUserId: coachA.userId, workoutId: secondId, athleteIds: [athleteInId], confirmClose: true })).ok).toBe(true);
    expect(await prisma.workoutAssignment.count({ where: { athleteId: athleteInId, workoutId: firstId, active: true } })).toBe(0);
    expect(await prisma.workoutAssignment.count({ where: { athleteId: athleteInId, workoutId: secondId, active: true } })).toBe(1);
    await expect(
      assignWorkout({ coachUserId: coachA.userId, workoutId: secondId, athleteIds: [athleteOutId], confirmClose: true }),
    ).rejects.toMatchObject({ status: 403 });
    expect(await prisma.workoutAssignment.count({ where: { athleteId: athleteOutId, workoutId: secondId } })).toBe(0);
    const active = await prisma.workoutAssignment.findFirst({ where: { athleteId: athleteInId, workoutId: secondId, active: true } });
    if (!active) throw new Error("assegnazione mancante");
    await closeAssignment(coachA.userId, active.id);
    expect(await prisma.workoutAssignment.count({ where: { id: active.id, active: true } })).toBe(0);
  });

  it("uploads a video, builds a sheet, assigns it and lets the athlete perform it", async () => {
    const bytes = Buffer.alloc(32);
    bytes.write("ftyp", 4, "ascii");
    const ticket = await beginUpload(coachA.userId, { mimeType: "video/mp4", sizeBytes: bytes.length });
    const uploaded = await PUT(
      new Request(`http://local${ticket.uploadUrl}`, {
        method: "PUT",
        headers: { "content-type": "video/mp4" },
        body: bytes,
      }),
    );
    expect(uploaded.status).toBe(200);
    const exerciseId = await createExercise(coachA.userId, { ...draft("Esecuzione filmata", "PRIVATE"), explanationUploadId: ticket.uploadId });
    ids.exercises.push(exerciseId);
    const workoutId = await createWorkout(coachA.userId, "Scheda filmata");
    ids.workouts.push(workoutId);
    const saved = await saveWorkout(coachA.userId, workoutId, { title: "Scheda filmata", exercises: [line(exerciseId)] });
    const assigned = await assignWorkout({ coachUserId: coachA.userId, workoutId, athleteIds: [athleteInId], confirmClose: true });
    expect(assigned.ok).toBe(true);
    const assignment = await prisma.workoutAssignment.findFirst({ where: { athleteId: athleteInId, workoutId, active: true } });
    if (!assignment || !saved.exercises[0]) throw new Error("scheda non assegnata");
    const sessionId = await openTrainingSession({
      athleteId: athleteInId,
      exerciseId,
      assignmentId: assignment.id,
      feedbackMode: "OFF",
    });
    await prisma.setResult.create({
      data: { sessionId, workoutExerciseId: saved.exercises[0].id, exerciseId, setNumber: 1, repsDone: 5 },
    });
    const video = await prisma.exerciseVideo.findFirst({ where: { exerciseId, kind: "EXPLANATION" } });
    if (!video) throw new Error("video mancante");
    expect(await signedVideoUrl({ userId: athleteInId, role: "ATHLETE", videoId: video.id })).toMatchObject({
      url: expect.stringContaining("/api/storage/file"),
    });
    expect(await prisma.workoutSession.count({ where: { id: sessionId, athleteId: athleteInId } })).toBe(1);
  });

  it("deletes an upload that was never attached", async () => {
    const ticket = await beginUpload(coachA.userId, { mimeType: "video/mp4", sizeBytes: 32 });
    await prisma.videoUpload.update({
      where: { id: ticket.uploadId },
      data: { createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    });
    expect(await cleanupOrphanUploads()).toBeGreaterThan(0);
    expect(await prisma.videoUpload.findUnique({ where: { id: ticket.uploadId } })).toBeNull();
    const attached = await prisma.videoUpload.count({ where: { coachId: coachA.profileId, attachedAt: { not: null } } });
    expect(attached).toBeGreaterThan(0);
  });
});

function draft(title: string, visibility: "PRIVATE" | "PUBLIC") {
  return {
    title,
    description: null,
    defaultSets: 2,
    defaultReps: 5,
    defaultTempo: null,
    defaultRestSeconds: 30,
    visibility,
  };
}

function line(exerciseId: string) {
  return { id: null, exerciseId, sets: 2, reps: 5, tempo: null, restSeconds: 30, notes: "Lento" };
}

async function createCoach(email: string, name: string) {
  const user = await prisma.user.create({ data: { email, name, role: "COACH" as const, passwordHash: "unused" } });
  const profile = await prisma.coachProfile.create({ data: { userId: user.id } });
  const lobby = await prisma.lobby.create({ data: { coachId: profile.id, name: `Lobby di ${name}` } });
  return { userId: user.id, profileId: profile.id, lobbyId: lobby.id };
}
