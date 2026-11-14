import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishLobbyEvent } from "@/lib/lobby/bus";
import type { LobbyEvent } from "@/lib/lobby/events";
import {
  classifyInvite,
  hashInviteToken,
  inviteExpiryDate,
  newInviteToken,
  type InviteExpiryDays,
} from "@/lib/lobby/invite";
import { endWatchesForSessions } from "@/lib/live/watch";
import { isSessionLive, isSessionStale, presenceWindowMs } from "@/lib/lobby/presence";

type Tx = Prisma.TransactionClient;

class InviteRollback extends Error {
  constructor(readonly reason: "other_coach") {
    super(reason);
  }
}

export async function createLobbyInvite(input: { coachUserId: string; days: InviteExpiryDays; email: string | null }) {
  const lobby = await coachLobby(input.coachUserId);
  if (!lobby) return null;
  const token = newInviteToken();
  const expiresAt = inviteExpiryDate(input.days);
  const invite = await prisma.invite.create({
    data: {
      lobbyId: lobby.id,
      tokenHash: hashInviteToken(token),
      email: input.email,
      expiresAt,
    },
    select: { id: true, expiresAt: true },
  });
  return { id: invite.id, token, expiresAt: invite.expiresAt };
}

export async function listLobbyInvites(coachUserId: string, now = new Date()) {
  const lobby = await coachLobby(coachUserId);
  if (!lobby) return null;
  await prisma.invite.updateMany({
    where: { lobbyId: lobby.id, status: "PENDING", expiresAt: { lte: now } },
    data: { status: "EXPIRED" },
  });
  return prisma.invite.findMany({
    where: { lobbyId: lobby.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, status: true, expiresAt: true, createdAt: true, acceptedAt: true },
  });
}

export async function revokeLobbyInvite(coachUserId: string, inviteId: string) {
  const lobby = await coachLobby(coachUserId);
  if (!lobby) return false;
  const updated = await prisma.invite.updateMany({
    where: { id: inviteId, lobbyId: lobby.id, status: { in: ["PENDING", "EXPIRED"] } },
    data: { status: "REVOKED" },
  });
  return updated.count === 1;
}

export async function inspectInvite(token: string, athleteEmail: string | null, now = new Date()) {
  const invite = await prisma.invite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { lobby: { include: { coach: { include: { user: { select: { name: true } } } } } } },
  });
  const view = classifyInvite(invite, athleteEmail, now);
  return {
    view,
    coachName: invite?.lobby.coach.user.name ?? null,
    lobbyId: invite?.lobbyId ?? null,
  };
}

export async function acceptInvite(input: {
  token: string;
  athleteId: string;
  athleteEmail: string;
  leaveCurrent: boolean;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const tokenHash = hashInviteToken(input.token);
  try {
    return await prisma.$transaction(async (tx) => {
      const invite = await tx.invite.findUnique({
        where: { tokenHash },
        include: { lobby: true },
      });
      const view = classifyInvite(invite, input.athleteEmail, now);
      if (!invite || view !== "valid") return { ok: false as const, reason: view };

      const consumed = await tx.invite.updateMany({
        where: { id: invite.id, status: "PENDING", expiresAt: { gt: now } },
        data: { status: "ACCEPTED", acceptedAt: now },
      });
      if (consumed.count !== 1) return { ok: false as const, reason: "used" as const };

      const membership = await tx.membership.findUnique({
        where: { athleteId: input.athleteId },
        include: { lobby: true },
      });
      if (membership?.lobbyId === invite.lobbyId) return { ok: true as const, alreadyMember: true };
      if (membership && !input.leaveCurrent) throw new InviteRollback("other_coach");
      if (membership) await releaseMembership(tx, input.athleteId, membership.lobby.coachId);
      await tx.membership.create({ data: { athleteId: input.athleteId, lobbyId: invite.lobbyId } });
      return { ok: true as const, alreadyMember: false };
    });
  } catch (error) {
    if (error instanceof InviteRollback) return { ok: false as const, reason: error.reason };
    throw error;
  }
}

async function releaseMembership(tx: Tx, athleteId: string, coachProfileId: string) {
  await tx.workoutAssignment.updateMany({
    where: { athleteId, active: true, workout: { coachId: coachProfileId } },
    data: { active: false },
  });
  await tx.membership.delete({ where: { athleteId } });
}

export async function leaveCoach(athleteId: string) {
  const membership = await prisma.membership.findUnique({
    where: { athleteId },
    include: { lobby: { include: { coach: { select: { userId: true } } } } },
  });
  if (!membership) return false;
  await prisma.$transaction(async (tx) => {
    await releaseMembership(tx, athleteId, membership.lobby.coachId);
  });
  publishLobbyEvent(membership.lobby.coach.userId, {
    type: "membershipChanged",
    athleteId,
    at: new Date().toISOString(),
  });
  return true;
}

export async function setPrivateLive(athleteId: string, privateLive: boolean) {
  const membership = await prisma.membership.findUnique({
    where: { athleteId },
    include: {
      athlete: { select: { name: true } },
      lobby: { include: { coach: { select: { userId: true } } } },
    },
  });
  if (!membership) return false;
  await prisma.membership.update({ where: { id: membership.id }, data: { privateLive } });
  if (privateLive) {
    const open = await prisma.workoutSession.findMany({
      where: { athleteId, status: "IN_PROGRESS" },
      select: { id: true },
    });
    endWatchesForSessions(open.map((session) => session.id));
  }
  publishLobbyEvent(membership.lobby.coach.userId, {
    type: "privacyChanged",
    athleteId,
    athleteName: membership.athlete.name,
    privateLive,
    at: new Date().toISOString(),
  });
  return true;
}

export async function coachLobby(coachUserId: string) {
  const profile = await prisma.coachProfile.findUnique({
    where: { userId: coachUserId },
    select: { lobby: { select: { id: true } } },
  });
  return profile?.lobby ?? null;
}

export async function abandonStaleSessions(athleteIds: string[], now = new Date()) {
  if (athleteIds.length === 0) return [];
  const cutoff = new Date(now.getTime() - presenceWindowMs);
  const stale = await prisma.workoutSession.findMany({
    where: {
      athleteId: { in: athleteIds },
      status: "IN_PROGRESS",
      OR: [{ lastSeenAt: { lt: cutoff } }, { lastSeenAt: null, startedAt: { lt: cutoff } }],
    },
    select: { id: true, athleteId: true },
  });
  if (stale.length === 0) return [];
  await prisma.workoutSession.updateMany({
    where: { id: { in: stale.map((session) => session.id) }, status: "IN_PROGRESS" },
    data: { status: "ABANDONED", endedAt: now },
  });
  return stale;
}

export type RosterAthlete = {
  id: string;
  name: string;
  privateLive: boolean;
  training: boolean;
  live: boolean;
  currentExercise: string | null;
  lastTrainingAt: string | null;
  sessionId: string | null;
};

export async function loadRoster(coachUserId: string, now = new Date()): Promise<RosterAthlete[] | null> {
  const lobby = await prisma.coachProfile.findUnique({
    where: { userId: coachUserId },
    select: {
      lobby: {
        select: {
          memberships: {
            select: {
              privateLive: true,
              athlete: { select: { id: true, name: true } },
            },
            orderBy: { joinedAt: "asc" },
          },
        },
      },
    },
  });
  if (!lobby?.lobby) return null;
  const members = lobby.lobby.memberships;
  const ids = members.map((member) => member.athlete.id);
  const abandoned = await abandonStaleSessions(ids, now);
  await Promise.all(abandoned.map((session) => notifySessionEnded(session.athleteId, session.id)));
  const sessions = await prisma.workoutSession.findMany({
    where: { athleteId: { in: ids } },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      athleteId: true,
      status: true,
      assignmentId: true,
      lastSeenAt: true,
      startedAt: true,
      currentExercise: { select: { title: true } },
    },
  });
  return members.map((member) => {
    const own = sessions.filter((session) => session.athleteId === member.athlete.id);
    const active = own.find((session) => isSessionLive(session, now));
    const latest = own[0];
    const live = Boolean(active?.assignmentId) && !member.privateLive;
    return {
      id: member.athlete.id,
      name: member.athlete.name,
      privateLive: member.privateLive,
      training: Boolean(active),
      live,
      currentExercise: active?.currentExercise?.title ?? null,
      lastTrainingAt: latest ? latest.startedAt.toISOString() : null,
      sessionId: live && active ? active.id : null,
    };
  });
}

export async function loadClient(coachUserId: string, athleteId: string) {
  const profile = await prisma.coachProfile.findUnique({
    where: { userId: coachUserId },
    select: { id: true, lobby: { select: { id: true } } },
  });
  if (!profile?.lobby) return null;
  const membership = await prisma.membership.findUnique({
    where: { athleteId },
    include: { athlete: { select: { id: true, name: true, email: true } } },
  });
  if (!membership || membership.lobbyId !== profile.lobby.id) return null;
  await abandonStaleSessions([athleteId]);

  const [assignment, sessions] = await Promise.all([
    prisma.workoutAssignment.findFirst({
      where: { athleteId, active: true, workout: { coachId: profile.id } },
      orderBy: { assignedAt: "desc" },
      include: {
        workout: {
          include: {
            exercises: { orderBy: { position: "asc" }, include: { exercise: { select: { title: true } } } },
          },
        },
      },
    }),
    prisma.workoutSession.findMany({
      where: { athleteId },
      orderBy: { startedAt: "desc" },
      take: 8,
      include: {
        setResults: { select: { errors: true, exerciseId: true } },
      },
    }),
  ]);

  const exerciseIds = new Set<string>();
  for (const session of sessions) {
    for (const set of session.setResults) exerciseIds.add(set.exerciseId);
  }
  const exercises = await prisma.exercise.findMany({
    where: { id: { in: [...exerciseIds] } },
    select: { id: true, title: true },
  });
  const titles = new Map(exercises.map((exercise) => [exercise.id, exercise.title]));

  return { membership, assignment, sessions, titles };
}

export async function touchSession(input: { sessionId: string; athleteId: string; exerciseId: string | null; now?: Date }) {
  const now = input.now ?? new Date();
  const session = await prisma.workoutSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, athleteId: true, status: true, lastSeenAt: true, startedAt: true },
  });
  if (!session || session.athleteId !== input.athleteId) return { ok: false as const, status: session ? 403 : 404 };
  if (session.status !== "IN_PROGRESS" || isSessionStale(session, now)) {
    if (session.status === "IN_PROGRESS") {
      await prisma.workoutSession.updateMany({
        where: { id: session.id, status: "IN_PROGRESS" },
        data: { status: "ABANDONED", endedAt: now },
      });
      await notifySessionEnded(input.athleteId, session.id);
    }
    return { ok: false as const, status: 409 };
  }
  const exercise = input.exerciseId
    ? await prisma.exercise.findUnique({ where: { id: input.exerciseId }, select: { id: true } })
    : null;
  await prisma.workoutSession.update({
    where: { id: session.id },
    data: { lastSeenAt: now, currentExerciseId: exercise?.id ?? null },
  });
  return { ok: true as const };
}

export async function openTrainingSession(input: {
  athleteId: string;
  exerciseId: string;
  assignmentId: string | null;
  feedbackMode: "FULL" | "CRITICAL_ONLY" | "OFF";
}) {
  const session = await prisma.workoutSession.create({
    data: {
      athleteId: input.athleteId,
      assignmentId: input.assignmentId,
      feedbackMode: input.feedbackMode,
      status: "IN_PROGRESS",
      lastSeenAt: new Date(),
      currentExerciseId: input.exerciseId,
    },
    select: { id: true },
  });
  await notifySessionStarted({
    athleteId: input.athleteId,
    sessionId: session.id,
    live: input.assignmentId !== null,
  });
  return session.id;
}

export async function notifySessionStarted(input: {
  athleteId: string;
  sessionId: string;
  live: boolean;
}) {
  const context = await athleteCoach(input.athleteId);
  if (!context) return;
  const event: LobbyEvent = {
    type: "sessionStarted",
    sessionId: input.sessionId,
    athleteId: input.athleteId,
    athleteName: context.name,
    live: input.live && !context.privateLive,
    at: new Date().toISOString(),
  };
  publishLobbyEvent(context.coachUserId, event);
}

export async function notifySessionEnded(athleteId: string, sessionId: string) {
  const context = await athleteCoach(athleteId);
  if (!context) return;
  publishLobbyEvent(context.coachUserId, {
    type: "sessionEnded",
    sessionId,
    athleteId,
    at: new Date().toISOString(),
  });
}

async function athleteCoach(athleteId: string) {
  const membership = await prisma.membership.findUnique({
    where: { athleteId },
    include: {
      athlete: { select: { name: true } },
      lobby: { include: { coach: { select: { userId: true } } } },
    },
  });
  if (!membership) return null;
  return {
    name: membership.athlete.name,
    privateLive: membership.privateLive,
    coachUserId: membership.lobby.coach.userId,
  };
}
