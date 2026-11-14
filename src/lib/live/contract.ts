import { z } from "zod";

export const liveTokenTtlMs = 90_000;
export const liveTokenRenewBeforeMs = 25_000;
export const liveTileLimit = 6;
export const coachPresencePollMs = 2_000;
export const coachPresenceHeartbeatMs = 4_000;
export const coachPresenceTtlMs = 12_000;

export const livePeerSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  sessionId: z.string().min(1),
});

export const issuedLiveTokenSchema = z.object({
  token: z.string().min(1),
  roomName: z.string().min(1),
  expiresAt: z.string().min(1),
  publish: z.object({ audio: z.boolean(), video: z.boolean() }),
  peers: z.array(livePeerSchema),
});

export type LivePeer = z.infer<typeof livePeerSchema>;
export type IssuedLiveToken = z.infer<typeof issuedLiveTokenSchema>;

export const liveDenialReasons = ["not_owner", "privacy", "inactive", "unassigned"] as const;
export type LiveDenialReason = (typeof liveDenialReasons)[number];

export const liveDenialCopy: Record<LiveDenialReason, string> = {
  not_owner: "Non puoi entrare in questa diretta.",
  privacy: "Il cliente ha attivato la privacy. La diretta è chiusa e non puoi rientrare.",
  inactive: "Il cliente non è più in diretta.",
  unassigned: "Questa sessione non è una scheda assegnata.",
};

export const liveExitCopy = {
  PRIVACY_ENABLED: liveDenialCopy.privacy,
  ATHLETE_LEFT: "Il cliente ha lasciato l'allenamento.",
} as const;

export function pageTiles<T>(items: readonly T[], page: number, limit = liveTileLimit) {
  const pages = Math.max(1, Math.ceil(items.length / limit));
  const safe = Math.min(Math.max(0, page), pages - 1);
  const start = safe * limit;
  return { page: safe, pages, tiles: items.slice(start, start + limit) };
}

export function coachExitForLobbyEvent(event: { type: string; privateLive?: boolean }) {
  if (event.type === "privacyChanged" && event.privateLive === true) return "PRIVACY_ENABLED" as const;
  if (event.type === "sessionEnded") return "ATHLETE_LEFT" as const;
  return null;
}

export function applyCoachSpeech(voice: { pause(): void; resume(): void }, speaking: boolean) {
  if (speaking) voice.pause();
  else voice.resume();
}

export function coachWatchLabel(name: string) {
  const first = name.trim().split(/\s+/)[0];
  return `${first || "Il coach"} ti sta guardando`;
}

export function tokenRenewDelayMs(expiresAt: string, now = Date.now()) {
  return Math.max(5_000, Date.parse(expiresAt) - now - liveTokenRenewBeforeMs);
}

export function peerKey(peers: readonly { sessionId: string }[]) {
  return peers
    .map((peer) => peer.sessionId)
    .sort()
    .join("\n");
}
