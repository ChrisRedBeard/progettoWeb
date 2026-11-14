import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { hashInviteToken } from "@/lib/lobby/invite";
import {
  acceptInvite,
  createLobbyInvite,
  loadClient,
  loadRoster,
  openTrainingSession,
  revokeLobbyInvite,
} from "@/lib/lobby/service";
import { prisma } from "@/lib/prisma";

const suffix = randomBytes(4).toString("hex");
const emails = {
  coachA: `phase4-a-${suffix}@fitai.local`,
  coachB: `phase4-b-${suffix}@fitai.local`,
  athlete: `phase4-atleta-${suffix}@fitai.local`,
};

describe("lobby flow on the database", () => {
  const ids = { users: [] as string[], lobbies: [] as string[], exercises: [] as string[], workouts: [] as string[] };

  afterAll(async () => {
    if (ids.users.length === 0) return;
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
    await prisma.membership.deleteMany({ where: { athleteId: { in: ids.users } } });
    if (ids.lobbies.length > 0) await prisma.invite.deleteMany({ where: { lobbyId: { in: ids.lobbies } } });
    if (ids.lobbies.length > 0) await prisma.lobby.deleteMany({ where: { id: { in: ids.lobbies } } });
    await prisma.coachProfile.deleteMany({ where: { userId: { in: ids.users } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.$disconnect();
  });

  it("accepts an invite once, keeps history, and drops a stale heartbeat", async () => {
    const coachA = await createCoach(emails.coachA, "Coach A");
    const coachB = await createCoach(emails.coachB, "Coach B");
    const athlete = await prisma.user.create({
      data: { email: emails.athlete, name: "Atleta Prova", role: "ATHLETE", passwordHash: "unused" },
    });
    ids.users.push(coachA.userId, coachB.userId, athlete.id);
    ids.lobbies.push(coachA.lobbyId, coachB.lobbyId);

    const invite = await createLobbyInvite({ coachUserId: coachA.userId, days: 7, email: null });
    expect(invite).not.toBeNull();
    if (!invite) return;
    const stored = await prisma.invite.findUnique({ where: { id: invite.id } });
    expect(stored?.tokenHash).toBe(hashInviteToken(invite.token));
    expect(stored?.tokenHash).not.toBe(invite.token);

    const accepted = await acceptInvite({
      token: invite.token,
      athleteId: athlete.id,
      athleteEmail: athlete.email,
      leaveCurrent: false,
    });
    expect(accepted).toEqual({ ok: true, alreadyMember: false });
    expect(await prisma.membership.count({ where: { athleteId: athlete.id } })).toBe(1);

    const again = await acceptInvite({
      token: invite.token,
      athleteId: athlete.id,
      athleteEmail: athlete.email,
      leaveCurrent: false,
    });
    expect(again).toMatchObject({ ok: false, reason: "used" });

    const racer = await prisma.user.create({
      data: {
        email: `phase4-gara-${suffix}@fitai.local`,
        name: "Atleta Gara",
        role: "ATHLETE",
        passwordHash: "unused",
      },
    });
    ids.users.push(racer.id);
    const raced = await createLobbyInvite({ coachUserId: coachA.userId, days: 1, email: null });
    if (!raced) throw new Error("invito mancante");
    const parallel = await Promise.all([
      acceptInvite({ token: raced.token, athleteId: racer.id, athleteEmail: racer.email, leaveCurrent: false }),
      acceptInvite({ token: raced.token, athleteId: racer.id, athleteEmail: racer.email, leaveCurrent: false }),
    ]);
    expect(parallel.filter((result) => result.ok)).toHaveLength(1);
    expect(await prisma.membership.count({ where: { athleteId: racer.id } })).toBe(1);
    expect((await prisma.invite.findUnique({ where: { id: raced.id } }))?.status).toBe("ACCEPTED");

    const locked = await createLobbyInvite({
      coachUserId: coachA.userId,
      days: 7,
      email: "altro@fitai.local",
    });
    if (!locked) throw new Error("invito mancante");
    const wrongEmail = await acceptInvite({
      token: locked.token,
      athleteId: athlete.id,
      athleteEmail: athlete.email,
      leaveCurrent: false,
    });
    expect(wrongEmail).toMatchObject({ ok: false, reason: "email" });
    expect((await prisma.invite.findUnique({ where: { id: locked.id } }))?.status).toBe("PENDING");

    const revocable = await createLobbyInvite({ coachUserId: coachA.userId, days: 7, email: null });
    if (!revocable) throw new Error("invito mancante");
    expect(await revokeLobbyInvite(coachA.userId, revocable.id)).toBe(true);
    const revoked = await acceptInvite({
      token: revocable.token,
      athleteId: athlete.id,
      athleteEmail: athlete.email,
      leaveCurrent: false,
    });
    expect(revoked).toMatchObject({ ok: false, reason: "revoked" });

    const expiring = await createLobbyInvite({ coachUserId: coachA.userId, days: 7, email: null });
    if (!expiring) throw new Error("invito mancante");
    await prisma.invite.update({
      where: { id: expiring.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    const expired = await acceptInvite({
      token: expiring.token,
      athleteId: athlete.id,
      athleteEmail: athlete.email,
      leaveCurrent: false,
    });
    expect(expired).toMatchObject({ ok: false, reason: "expired" });

    const exercise = await prisma.exercise.create({
      data: {
        coachId: coachA.profileId,
        title: "Affondi di prova",
        visibility: "PRIVATE",
        analysisType: "NONE",
      },
    });
    ids.exercises.push(exercise.id);
    const workout = await prisma.workout.create({
      data: { coachId: coachA.profileId, title: "Scheda di prova" },
    });
    ids.workouts.push(workout.id);
    await prisma.workoutExercise.create({ data: { workoutId: workout.id, exerciseId: exercise.id, position: 1 } });
    const assignment = await prisma.workoutAssignment.create({
      data: { workoutId: workout.id, athleteId: athlete.id, active: true },
    });

    const sessionId = await openTrainingSession({
      athleteId: athlete.id,
      exerciseId: exercise.id,
      assignmentId: assignment.id,
      feedbackMode: "OFF",
    });
    const roster = await loadRoster(coachA.userId);
    const row = roster?.find((member) => member.id === athlete.id);
    expect(row?.training).toBe(true);
    expect(row?.live).toBe(true);
    expect(row?.currentExercise).toBe("Affondi di prova");
    expect(await loadRoster(athlete.id)).toBeNull();
    expect(await loadClient(coachB.userId, athlete.id)).toBeNull();
    expect(await loadClient(coachA.userId, athlete.id)).not.toBeNull();

    await prisma.workoutSession.update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date(Date.now() - 2 * 60_000) },
    });
    const afterGap = await loadRoster(coachA.userId);
    expect(afterGap?.find((member) => member.id === athlete.id)?.training).toBe(false);
    expect((await prisma.workoutSession.findUnique({ where: { id: sessionId } }))?.status).toBe("ABANDONED");

    await prisma.workoutSession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED", lastSeenAt: new Date(), endedAt: new Date() },
    });
    const closed = await loadRoster(coachA.userId);
    expect(closed?.find((member) => member.id === athlete.id)?.training).toBe(false);

    const moving = await createLobbyInvite({ coachUserId: coachB.userId, days: 7, email: null });
    if (!moving) throw new Error("invito mancante");
    const blocked = await acceptInvite({
      token: moving.token,
      athleteId: athlete.id,
      athleteEmail: athlete.email,
      leaveCurrent: false,
    });
    expect(blocked).toMatchObject({ ok: false, reason: "other_coach" });
    expect((await prisma.invite.findUnique({ where: { id: moving.id } }))?.status).toBe("PENDING");
    expect((await prisma.membership.findUnique({ where: { athleteId: athlete.id } }))?.lobbyId).toBe(coachA.lobbyId);

    const moved = await acceptInvite({
      token: moving.token,
      athleteId: athlete.id,
      athleteEmail: athlete.email,
      leaveCurrent: true,
    });
    expect(moved).toEqual({ ok: true, alreadyMember: false });
    expect((await prisma.membership.findUnique({ where: { athleteId: athlete.id } }))?.lobbyId).toBe(coachB.lobbyId);
    expect((await prisma.workoutAssignment.findUnique({ where: { id: assignment.id } }))?.active).toBe(false);
    expect(await prisma.workoutSession.count({ where: { id: sessionId, athleteId: athlete.id } })).toBe(1);
    expect(await loadClient(coachA.userId, athlete.id)).toBeNull();
    expect(await loadClient(coachB.userId, athlete.id)).not.toBeNull();
  });
});

async function createCoach(email: string, name: string) {
  const user = await prisma.user.create({
    data: { email, name, role: "COACH", passwordHash: "unused" },
  });
  const profile = await prisma.coachProfile.create({ data: { userId: user.id } });
  const lobby = await prisma.lobby.create({ data: { coachId: profile.id, name: `Lobby di ${name}` } });
  return { userId: user.id, profileId: profile.id, lobbyId: lobby.id };
}
