import { describe, expect, it } from "vitest";
import { isSessionLive, isSessionStale, presenceWindowMs } from "@/lib/lobby/presence";

const now = new Date("2026-11-13T12:00:00.000Z");

describe("session presence", () => {
  it("treats a fresh in-progress session as live and a closed one as not live", () => {
    const fresh = new Date(now.getTime() - 1_000);
    expect(isSessionLive({ status: "IN_PROGRESS", lastSeenAt: fresh }, now)).toBe(true);
    expect(isSessionLive({ status: "COMPLETED", lastSeenAt: fresh }, now)).toBe(false);
    expect(isSessionLive({ status: "ABANDONED", lastSeenAt: fresh }, now)).toBe(false);
    expect(isSessionLive({ status: "IN_PROGRESS", lastSeenAt: null }, now)).toBe(false);
  });

  it("goes stale only after the presence window", () => {
    const edge = new Date(now.getTime() - presenceWindowMs);
    const past = new Date(now.getTime() - presenceWindowMs - 1);
    expect(isSessionStale({ status: "IN_PROGRESS", lastSeenAt: edge }, now)).toBe(false);
    expect(isSessionStale({ status: "IN_PROGRESS", lastSeenAt: past }, now)).toBe(true);
    expect(isSessionStale({ status: "COMPLETED", lastSeenAt: past }, now)).toBe(false);
    expect(isSessionLive({ status: "IN_PROGRESS", lastSeenAt: past }, now)).toBe(false);
  });
});
