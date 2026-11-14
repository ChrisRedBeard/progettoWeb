import { coachPresenceTtlMs } from "@/lib/live/contract";

type Watch = {
  sessionId: string;
  coachUserId: string;
  coachName: string;
  speaking: boolean;
  expiresAt: number;
};

const watches = new Map<string, Watch>();

export function rememberCoachWatch(input: {
  sessionId: string;
  coachUserId: string;
  coachName: string;
  now?: number;
  ttlMs?: number;
}) {
  const now = input.now ?? Date.now();
  const previous = watches.get(input.sessionId);
  watches.set(input.sessionId, {
    sessionId: input.sessionId,
    coachUserId: input.coachUserId,
    coachName: input.coachName,
    speaking: previous?.coachUserId === input.coachUserId ? previous.speaking : false,
    expiresAt: now + (input.ttlMs ?? coachPresenceTtlMs),
  });
}

export function readWatch(sessionId: string, now = Date.now()) {
  const watch = watches.get(sessionId);
  if (!watch) return null;
  if (watch.expiresAt <= now) {
    watches.delete(sessionId);
    return null;
  }
  return watch;
}

export function setWatchSpeaking(coachUserId: string, sessionId: string, speaking: boolean, now = Date.now()) {
  const watch = readWatch(sessionId, now);
  if (!watch || watch.coachUserId !== coachUserId) return false;
  watch.speaking = speaking;
  return true;
}

export function endCoachWatch(coachUserId: string, sessionId: string) {
  const watch = watches.get(sessionId);
  if (!watch || watch.coachUserId !== coachUserId) return false;
  watches.delete(sessionId);
  return true;
}

export function endCoachWatches(coachUserId: string) {
  for (const [sessionId, watch] of watches) {
    if (watch.coachUserId === coachUserId) watches.delete(sessionId);
  }
}

export function endWatchesForSessions(sessionIds: readonly string[]) {
  for (const sessionId of sessionIds) watches.delete(sessionId);
}

export function resetWatches() {
  watches.clear();
}
