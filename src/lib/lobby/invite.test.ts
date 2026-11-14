import { describe, expect, it } from "vitest";
import { classifyInvite, hashInviteToken, newInviteToken } from "@/lib/lobby/invite";

const now = new Date("2026-11-13T12:00:00.000Z");

describe("invite token", () => {
  it("stores a hash that is not the token", () => {
    const token = newInviteToken();
    const hash = hashInviteToken(token);
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(hash).toHaveLength(64);
    expect(hash).not.toBe(token);
    expect(hashInviteToken(token)).toBe(hash);
  });
});

describe("classifyInvite", () => {
  const pending = {
    status: "PENDING" as const,
    expiresAt: new Date("2026-11-20T12:00:00.000Z"),
    email: null as string | null,
  };

  it("covers every visible state", () => {
    expect(classifyInvite(null, null, now)).toBe("not_found");
    expect(classifyInvite({ ...pending, status: "REVOKED" }, null, now)).toBe("revoked");
    expect(classifyInvite({ ...pending, status: "ACCEPTED" }, null, now)).toBe("used");
    expect(classifyInvite({ ...pending, status: "EXPIRED" }, null, now)).toBe("expired");
    expect(classifyInvite({ ...pending, expiresAt: now }, "a@fitai.local", now)).toBe("expired");
    expect(classifyInvite({ ...pending, email: "a@fitai.local" }, "b@fitai.local", now)).toBe("email");
    expect(classifyInvite({ ...pending, email: "A@fitai.local" }, "a@fitai.local", now)).toBe("valid");
    expect(classifyInvite(pending, null, now)).toBe("valid");
  });
});
