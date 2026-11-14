import { randomBytes } from "node:crypto";
import { liveTokenTtlMs, type IssuedLiveToken, type LiveDenialReason, type LivePeer } from "@/lib/live/contract";
import { endCoachWatch, endCoachWatches, readWatch, rememberCoachWatch, setWatchSpeaking } from "@/lib/live/watch";
import { isSessionLive, isSessionStale } from "@/lib/lobby/presence";
import { abandonStaleSessions, coachLobby, loadRoster } from "@/lib/lobby/service";
import { prisma } from "@/lib/prisma";

export type LiveTokenResult = { ok: true; ticket: IssuedLiveToken } | { ok: false; reason: LiveDenialReason };

function mint(roomName: string, publish: { audio: boolean; video: boolean }, peers: LivePeer[], now: Date): IssuedLiveToken {
  return {
    token: randomBytes(32).toString("base64url"),
    roomName,
    expiresAt: new Date(now.getTime() + liveTokenTtlMs).toISOString(),
    publish,
    peers,
  };
}

export async function issueLiveToken(input: {
  userId: string;
  role: "COACH" | "ATHLETE";
  scope: "lobby" | "session";
  sessionId?: string;
  now?: Date;
}): Promise<LiveTokenResult> {
  const now = input.now ?? new Date();
  if (input.role === "ATHLETE" && input.scope === "lobby") return { ok: false, reason: "not_owner" };
  if (input.role === "COACH" && input.scope === "lobby") return issueLobbyToken(input.userId, now);
  if (!input.sessionId) return { ok: false, reason: "not_owner" };
  if (input.role === "COACH") return issueCoachSessionToken(input.userId, input.sessionId, now);
  return issueAthleteSessionToken(input.userId, input.sessionId, now);
}

async function issueLobbyToken(coachUserId: string, now: Date): Promise<LiveTokenResult> {
  const [lobby, coach, roster] = await Promise.all([
    coachLobby(coachUserId),
    prisma.user.findUnique({ where: { id: coachUserId }, select: { name: true } }),
    loadRoster(coachUserId, now),
  ]);
  if (!lobby || !roster || !coach) return { ok: false, reason: "not_owner" };
  const peers = roster.flatMap((athlete) =>
    athlete.live && athlete.sessionId
      ? [{ id: athlete.id, displayName: athlete.name, sessionId: athlete.sessionId }]
      : [],
  );
  const ticket = mint(`lobby-${lobby.id}`, { audio: true, video: false }, peers, now);
  endCoachWatches(coachUserId);
  for (const peer of peers) {
    rememberCoachWatch({ sessionId: peer.sessionId, coachUserId, coachName: coach.name, now: now.getTime() });
  }
  return { ok: true, ticket };
}

async function issueCoachSessionToken(coachUserId: string, sessionId: string, now: Date): Promise<LiveTokenResult> {
  const session = await loadSession(sessionId);
  if (!session) return { ok: false, reason: "not_owner" };
  const coachUser = session.athlete.membership?.lobby.coach.userId;
  if (!coachUser || coachUser !== coachUserId) return { ok: false, reason: "not_owner" };
  const denied = await denyIfClosed(session, now);
  if (denied) return denied;
  const coachName = session.athlete.membership?.lobby.coach.user.name ?? "Coach";
  const ticket = mint(
    `room-${session.id}`,
    { audio: true, video: false },
    [{ id: session.athleteId, displayName: session.athlete.name, sessionId: session.id }],
    now,
  );
  rememberCoachWatch({ sessionId: session.id, coachUserId, coachName, now: now.getTime() });
  return { ok: true, ticket };
}

async function issueAthleteSessionToken(athleteId: string, sessionId: string, now: Date): Promise<LiveTokenResult> {
  const session = await loadSession(sessionId);
  if (!session || session.athleteId !== athleteId) return { ok: false, reason: "not_owner" };
  const denied = await denyIfClosed(session, now);
  if (denied) return denied;
  return {
    ok: true,
    ticket: mint(`room-${session.id}`, { audio: true, video: true }, [], now),
  };
}

async function denyIfClosed(
  session: NonNullable<Awaited<ReturnType<typeof loadSession>>>,
  now: Date,
): Promise<LiveTokenResult | null> {
  if (session.athlete.membership?.privateLive) return { ok: false, reason: "privacy" };
  if (!isSessionLive(session, now)) {
    if (isSessionStale(session, now)) await abandonStaleSessions([session.athleteId], now);
    return { ok: false, reason: "inactive" };
  }
  if (!session.assignmentId) return { ok: false, reason: "unassigned" };
  return null;
}

function loadSession(sessionId: string) {
  return prisma.workoutSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      athleteId: true,
      assignmentId: true,
      status: true,
      lastSeenAt: true,
      startedAt: true,
      athlete: {
        select: {
          name: true,
          membership: {
            select: {
              privateLive: true,
              lobby: {
                select: {
                  coach: { select: { userId: true, user: { select: { name: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function readLivePresence(athleteId: string, sessionId: string) {
  const session = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    select: { athleteId: true },
  });
  if (!session || session.athleteId !== athleteId) return null;
  const watch = readWatch(sessionId);
  if (!watch) return { watching: false as const, coachName: null, speaking: false as const };
  return { watching: true as const, coachName: watch.coachName, speaking: watch.speaking };
}

export function setLiveSpeaking(coachUserId: string, sessionId: string, speaking: boolean) {
  return setWatchSpeaking(coachUserId, sessionId, speaking);
}

export async function renewCoachPresence(input: {
  userId: string;
  role: "COACH" | "ATHLETE";
  scope: "lobby" | "session";
  sessionId?: string;
  now?: Date;
}): Promise<{ ok: true } | { ok: false; reason: LiveDenialReason }> {
  const now = input.now ?? new Date();
  if (input.role !== "COACH") return { ok: false, reason: "not_owner" };
  if (input.scope === "lobby") {
    const roster = await loadRoster(input.userId, now);
    const coach = await prisma.user.findUnique({ where: { id: input.userId }, select: { name: true } });
    if (!roster || !coach) return { ok: false, reason: "not_owner" };
    endCoachWatches(input.userId);
    for (const athlete of roster) {
      if (!athlete.live || !athlete.sessionId) continue;
      rememberCoachWatch({ sessionId: athlete.sessionId, coachUserId: input.userId, coachName: coach.name, now: now.getTime() });
    }
    return { ok: true };
  }
  if (!input.sessionId) return { ok: false, reason: "not_owner" };
  const session = await loadSession(input.sessionId);
  if (!session) return { ok: false, reason: "not_owner" };
  const coachUser = session.athlete.membership?.lobby.coach.userId;
  if (!coachUser || coachUser !== input.userId) return { ok: false, reason: "not_owner" };
  const denied = await denyIfClosed(session, now);
  if (denied) {
    endCoachWatch(input.userId, session.id);
    return denied;
  }
  const coachName = session.athlete.membership?.lobby.coach.user.name ?? "Coach";
  rememberCoachWatch({ sessionId: session.id, coachUserId: input.userId, coachName, now: now.getTime() });
  return { ok: true };
}

export function leaveLiveWatch(coachUserId: string, input: { scope: "lobby" } | { sessionId: string }) {
  if ("scope" in input) {
    endCoachWatches(coachUserId);
    return;
  }
  endCoachWatch(coachUserId, input.sessionId);
}
