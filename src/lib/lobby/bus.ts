import type { LobbyEvent } from "@/lib/lobby/events";

type Listener = (event: LobbyEvent) => void;

const channels = new Map<string, Set<Listener>>();

export function publishLobbyEvent(coachUserId: string, event: LobbyEvent) {
  for (const listener of channels.get(coachUserId) ?? []) listener(event);
}

export function subscribeLobby(coachUserId: string, listener: Listener) {
  const set = channels.get(coachUserId) ?? new Set<Listener>();
  set.add(listener);
  channels.set(coachUserId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) channels.delete(coachUserId);
  };
}
