import { describe, expect, it } from "vitest";
import { lobbyReadDecision } from "@/lib/lobby/events";

describe("lobbyReadDecision", () => {
  it("lets only a coach read the lobby", () => {
    expect(lobbyReadDecision("COACH")).toBe("allow");
    expect(lobbyReadDecision("ATHLETE")).toBe("forbidden");
    expect(lobbyReadDecision(null)).toBe("forbidden");
  });
});
