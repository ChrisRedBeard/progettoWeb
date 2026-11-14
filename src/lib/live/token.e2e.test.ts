import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { issueLiveToken, readLivePresence, setLiveSpeaking } from "@/lib/live/issue";
import { resetWatches } from "@/lib/live/watch";
import { setPrivateLive } from "@/lib/lobby/service";
import { prisma } from "@/lib/prisma";

const suffix = randomBytes(4).toString("hex");

describe("live token permissions", () => {
  const ids = { users: [] as string[], lobbies: [] as string[], workouts: [] as string[] };

  afterAll(async () => {
    resetWatches();
    if (ids.users.length === 0) return;
    await prisma.workoutSession.deleteMany({ where: { athleteId: { in: ids.users } } });
    await prisma.workoutAssignment.deleteMany({ where: { athleteId: { in: ids.users } } });
    if (ids.workouts.length > 0) await prisma.workout.deleteMany({ where: { id: { in: ids.workouts } } });
    await prisma.membership.deleteMany({ where: { athleteId: { in: ids.users } } });
    if (ids.lobbies.length > 0) await prisma.invite.deleteMany({ where: { lobbyId: { in: ids.lobbies } } });
    if (ids.lobbies.length > 0) await prisma.lobby.deleteMany({ where: { id: { in: ids.lobbies } } });
    await prisma.coachProfile.deleteMany({ where: { userId: { in: ids.users } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.$disconnect();
  });

  it("rejects the wrong coach, privacy, a stale session and an athlete asking for the coach token", async () => {
    resetWatches();
    const coachA = await createCoach(`phase5-a-${suffix}@fitai.local`, "Martina Greco");
    const coachB = await createCoach(`phase5-b-${suffix}@fitai.local`, "Altro Coach");
    const athlete = await prisma.user.create({
      data: { email: `phase5-atleta-${suffix}@fitai.local`, name: "Giulia Bianchi", role: "ATHLETE", passwordHash: "unused" },
    });
    ids.users.push(coachA.userId, coachB.userId, athlete.id);
    ids.lobbies.push(coachA.lobbyId, coachB.lobbyId);
    await prisma.membership.create({ data: { athleteId: athlete.id, lobbyId: coachA.lobbyId } });
    const workout = await prisma.workout.create({ data: { coachId: coachA.profileId, title: "Scheda fase 5" } });
    ids.workouts.push(workout.id);
    const assignment = await prisma.workoutAssignment.create({
      data: { workoutId: workout.id, athleteId: athlete.id, active: true },
    });
    const session = await prisma.workoutSession.create({
      data: { athleteId: athlete.id, assignmentId: assignment.id, status: "IN_PROGRESS", lastSeenAt: new Date() },
    });
    const free = await prisma.workoutSession.create({
      data: {
        athleteId: athlete.id,
        assignmentId: null,
        status: "IN_PROGRESS",
        lastSeenAt: new Date(),
        startedAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    });

    const coachToken = await issueLiveToken({ userId: coachA.userId, role: "COACH", scope: "session", sessionId: session.id });
    expect(coachToken.ok).toBe(true);
    if (coachToken.ok) {
      expect(coachToken.ticket.publish).toEqual({ audio: true, video: false });
      expect(coachToken.ticket.peers.map((peer) => peer.id)).toEqual([athlete.id]);
    }
    expect(await readLivePresence(athlete.id, session.id)).toMatchObject({ watching: true, coachName: "Martina Greco", speaking: false });
    expect(setLiveSpeaking(coachA.userId, session.id, true)).toBe(true);
    expect(await readLivePresence(athlete.id, session.id)).toMatchObject({ speaking: true });

    expect(await issueLiveToken({ userId: coachB.userId, role: "COACH", scope: "session", sessionId: session.id })).toMatchObject({
      ok: false,
      reason: "not_owner",
    });
    expect(await issueLiveToken({ userId: athlete.id, role: "COACH", scope: "session", sessionId: session.id })).toMatchObject({
      ok: false,
      reason: "not_owner",
    });
    expect(await issueLiveToken({ userId: athlete.id, role: "ATHLETE", scope: "lobby" })).toMatchObject({ ok: false, reason: "not_owner" });

    const athleteToken = await issueLiveToken({ userId: athlete.id, role: "ATHLETE", scope: "session", sessionId: session.id });
    expect(athleteToken.ok).toBe(true);
    if (athleteToken.ok) expect(athleteToken.ticket.publish).toEqual({ audio: true, video: true });

    expect(await setPrivateLive(athlete.id, true)).toBe(true);
    expect(await readLivePresence(athlete.id, session.id)).toMatchObject({ watching: false });
    expect(await issueLiveToken({ userId: coachA.userId, role: "COACH", scope: "session", sessionId: session.id })).toMatchObject({
      ok: false,
      reason: "privacy",
    });
    expect(await issueLiveToken({ userId: coachA.userId, role: "COACH", scope: "session", sessionId: session.id })).toMatchObject({
      ok: false,
      reason: "privacy",
    });

    expect(await setPrivateLive(athlete.id, false)).toBe(true);
    const lobby = await issueLiveToken({ userId: coachA.userId, role: "COACH", scope: "lobby" });
    expect(lobby.ok).toBe(true);
    if (lobby.ok) expect(lobby.ticket.peers.map((peer) => peer.sessionId)).toEqual([session.id]);

    expect(await issueLiveToken({ userId: coachA.userId, role: "COACH", scope: "session", sessionId: free.id })).toMatchObject({
      ok: false,
      reason: "unassigned",
    });

    await prisma.workoutSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(Date.now() - 2 * 60 * 1000) },
    });
    expect(await issueLiveToken({ userId: coachA.userId, role: "COACH", scope: "session", sessionId: session.id })).toMatchObject({
      ok: false,
      reason: "inactive",
    });
    expect((await prisma.workoutSession.findUnique({ where: { id: session.id } }))?.status).toBe("ABANDONED");
  });
});

async function createCoach(email: string, name: string) {
  const user = await prisma.user.create({ data: { email, name, role: "COACH", passwordHash: "unused" } });
  const profile = await prisma.coachProfile.create({ data: { userId: user.id } });
  const lobby = await prisma.lobby.create({ data: { coachId: profile.id, name: `Lobby di ${name}` } });
  return { userId: user.id, profileId: profile.id, lobbyId: lobby.id };
}
