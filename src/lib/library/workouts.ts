import { LibraryError } from "@/lib/library/errors";
import type { WorkoutSaveInput } from "@/lib/library/schema";
import { prisma } from "@/lib/prisma";

async function ownProfile(coachUserId: string) {
  const profile = await prisma.coachProfile.findUnique({
    where: { userId: coachUserId },
    select: { id: true, lobby: { select: { id: true } } },
  });
  if (!profile) throw new LibraryError("Profilo non trovato.", 404);
  return profile;
}

export async function listWorkouts(coachUserId: string) {
  const profile = await prisma.coachProfile.findUnique({ where: { userId: coachUserId }, select: { id: true } });
  if (!profile) return null;
  const rows = await prisma.workout.findMany({
    where: { coachId: profile.id },
    orderBy: { createdAt: "desc" },
    include: {
      exercises: { where: { removedAt: null }, select: { id: true } },
      assignments: { where: { active: true }, select: { id: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    exercises: row.exercises.length,
    activeAssignments: row.assignments.length,
  }));
}

export async function createWorkout(coachUserId: string, title: string) {
  const profile = await ownProfile(coachUserId);
  const workout = await prisma.workout.create({ data: { coachId: profile.id, title } });
  return workout.id;
}

export async function getWorkoutEditor(coachUserId: string, workoutId: string) {
  const profile = await ownProfile(coachUserId);
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, coachId: profile.id },
    include: {
      exercises: {
        where: { removedAt: null },
        orderBy: { position: "asc" },
        include: {
          exercise: {
            select: { id: true, title: true, defaultSets: true, defaultReps: true, defaultTempo: true, defaultRestSeconds: true },
          },
        },
      },
    },
  });
  if (!workout) return null;
  const members = profile.lobby
    ? await prisma.membership.findMany({
        where: { lobbyId: profile.lobby.id },
        orderBy: { joinedAt: "asc" },
        select: { athlete: { select: { id: true, name: true } } },
      })
    : [];
  const athleteIds = members.map((member) => member.athlete.id);
  const active = await prisma.workoutAssignment.findMany({
    where: { athleteId: { in: athleteIds }, active: true },
    select: { id: true, athleteId: true, workoutId: true, workout: { select: { title: true } } },
  });
  const byAthlete = new Map(active.map((row) => [row.athleteId, row]));
  return {
    id: workout.id,
    title: workout.title,
    exercises: workout.exercises.map((item) => ({
      id: item.id,
      exerciseId: item.exerciseId,
      title: item.exercise.title,
      sets: item.sets ?? item.exercise.defaultSets,
      reps: item.reps ?? item.exercise.defaultReps,
      tempo: item.tempo ?? item.exercise.defaultTempo ?? "",
      restSeconds: item.restSeconds ?? item.exercise.defaultRestSeconds,
      notes: item.notes ?? "",
    })),
    athletes: members.map((member) => {
      const current = byAthlete.get(member.athlete.id);
      return {
        id: member.athlete.id,
        name: member.athlete.name,
        activeTitle: current?.workout.title ?? null,
        activeAssignmentId: current?.id ?? null,
        activeWorkoutId: current?.workoutId ?? null,
      };
    }),
  };
}

export async function saveWorkout(coachUserId: string, workoutId: string, input: WorkoutSaveInput) {
  const profile = await ownProfile(coachUserId);
  const workout = await prisma.workout.findFirst({ where: { id: workoutId, coachId: profile.id }, select: { id: true } });
  if (!workout) throw new LibraryError("Scheda non trovata.", 404);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.workoutExercise.findMany({ where: { workoutId, removedAt: null } });
    const kept = new Set(input.exercises.flatMap((item) => (item.id ? [item.id] : [])));
    const removing = existing.filter((row) => !kept.has(row.id));
    const openSessions = await tx.workoutSession.count({
      where: { status: "IN_PROGRESS", assignment: { workoutId } },
    });
    const lowest = await tx.workoutExercise.aggregate({ where: { workoutId }, _min: { position: true } });
    let park = Math.min(-1, (lowest._min.position ?? 0) - 1);
    for (const row of removing) {
      const deleted =
        openSessions > 0
          ? { count: 0 }
          : await tx.workoutExercise.deleteMany({ where: { id: row.id, setResults: { none: {} } } });
      if (deleted.count === 1) continue;
      await tx.workoutExercise.update({
        where: { id: row.id },
        data: { removedAt: new Date(), position: park },
      });
      park -= 1;
    }

    const active = await tx.workoutExercise.findMany({ where: { workoutId, removedAt: null } });
    const activeById = new Map(active.map((row) => [row.id, row]));
    let temp = 10_000;
    const orderedIds: string[] = [];
    for (const item of input.exercises) {
      const notes = item.notes?.trim() ? item.notes.trim() : null;
      const tempo = item.tempo?.trim() ? item.tempo.trim() : null;
      const data = { sets: item.sets, reps: item.reps, tempo, restSeconds: item.restSeconds, notes, position: temp++ };
      if (item.id) {
        const row = activeById.get(item.id);
        if (!row) throw new LibraryError("Un esercizio della scheda non è più modificabile.", 400);
        if (row.exerciseId !== item.exerciseId) throw new LibraryError("Non si cambia l'esercizio di una riga già in scheda.", 400);
        await tx.workoutExercise.update({ where: { id: row.id }, data });
        orderedIds.push(row.id);
        continue;
      }
      await assertAddable(tx, profile.id, item.exerciseId);
      const created = await tx.workoutExercise.create({
        data: { workoutId, exerciseId: item.exerciseId, ...data },
      });
      orderedIds.push(created.id);
    }
    for (const [index, id] of orderedIds.entries()) {
      await tx.workoutExercise.update({ where: { id }, data: { position: index } });
    }
    await tx.workout.update({ where: { id: workoutId }, data: { title: input.title } });
    const saved = await tx.workoutExercise.findMany({
      where: { workoutId, removedAt: null },
      orderBy: { position: "asc" },
      select: { id: true, exerciseId: true, sets: true, reps: true, tempo: true, restSeconds: true, notes: true },
    });
    return { id: workoutId, title: input.title, exercises: saved };
  });
}

async function assertAddable(tx: Pick<typeof prisma, "exercise">, coachProfileId: string, exerciseId: string) {
  const exercise = await tx.exercise.findUnique({
    where: { id: exerciseId },
    select: { coachId: true, visibility: true, archivedAt: true },
  });
  const allowed =
    exercise &&
    !exercise.archivedAt &&
    (exercise.coachId === coachProfileId || (exercise.coachId === null && exercise.visibility === "PUBLIC"));
  if (!allowed) throw new LibraryError("Questo esercizio non si può aggiungere alla scheda.", 400);
}

export async function assignWorkout(input: {
  coachUserId: string;
  workoutId: string;
  athleteIds: string[];
  confirmClose: boolean;
}) {
  const profile = await ownProfile(input.coachUserId);
  const workout = await prisma.workout.findFirst({
    where: { id: input.workoutId, coachId: profile.id },
    select: { id: true, title: true },
  });
  if (!workout || !profile.lobby) throw new LibraryError("Scheda non trovata.", 404);
  const uniqueIds = [...new Set(input.athleteIds)];
  const members = await prisma.membership.findMany({
    where: { lobbyId: profile.lobby.id, athleteId: { in: uniqueIds } },
    select: { athlete: { select: { id: true, name: true } } },
  });
  if (members.length !== uniqueIds.length) {
    throw new LibraryError("Puoi assegnare solo ai clienti della tua lobby.", 403);
  }
  const current = await prisma.workoutAssignment.findMany({
    where: { athleteId: { in: uniqueIds }, active: true, workoutId: { not: workout.id } },
    select: { athleteId: true, workout: { select: { title: true } } },
  });
  if (current.length > 0 && !input.confirmClose) {
    const names = new Map(members.map((member) => [member.athlete.id, member.athlete.name]));
    return {
      ok: false as const,
      status: 409,
      closing: current.map((row) => ({
        athleteId: row.athleteId,
        athleteName: names.get(row.athleteId) ?? "Cliente",
        workoutTitle: row.workout.title,
      })),
    };
  }
  await prisma.$transaction(async (tx) => {
    if (current.length > 0) {
      await tx.workoutAssignment.updateMany({
        where: { athleteId: { in: current.map((row) => row.athleteId) }, active: true },
        data: { active: false },
      });
    }
    for (const athleteId of uniqueIds) {
      const same = await tx.workoutAssignment.findFirst({
        where: { athleteId, workoutId: workout.id, active: true },
        select: { id: true },
      });
      if (same) continue;
      await tx.workoutAssignment.create({ data: { workoutId: workout.id, athleteId, active: true } });
    }
  });
  return { ok: true as const };
}

export async function closeAssignment(coachUserId: string, assignmentId: string) {
  const profile = await ownProfile(coachUserId);
  const updated = await prisma.workoutAssignment.updateMany({
    where: { id: assignmentId, active: true, workout: { coachId: profile.id } },
    data: { active: false },
  });
  if (updated.count !== 1) throw new LibraryError("Assegnazione non trovata.", 404);
}
