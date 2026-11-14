export const presenceWindowMs = 60_000;
export const heartbeatEveryMs = 20_000;
export const lobbyRefreshMs = 30_000;

export type PresenceSession = {
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  lastSeenAt: Date | null;
  startedAt?: Date;
};

export function isSessionLive(session: PresenceSession, now: Date) {
  if (session.status !== "IN_PROGRESS" || session.lastSeenAt === null) return false;
  return now.getTime() - session.lastSeenAt.getTime() <= presenceWindowMs;
}

export function isSessionStale(session: PresenceSession, now: Date) {
  if (session.status !== "IN_PROGRESS") return false;
  const seen = session.lastSeenAt ?? session.startedAt ?? null;
  if (!seen) return true;
  return now.getTime() - seen.getTime() > presenceWindowMs;
}
