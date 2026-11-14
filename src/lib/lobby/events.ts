export type LobbyEvent =
  | {
      type: "sessionStarted";
      sessionId: string;
      athleteId: string;
      athleteName: string;
      live: boolean;
      at: string;
    }
  | { type: "sessionEnded"; sessionId: string; athleteId: string; at: string }
  | { type: "privacyChanged"; athleteId: string; athleteName: string; privateLive: boolean; at: string }
  | { type: "membershipChanged"; athleteId: string; at: string };

export function lobbyReadDecision(role: "COACH" | "ATHLETE" | null) {
  return role === "COACH" ? ("allow" as const) : ("forbidden" as const);
}
