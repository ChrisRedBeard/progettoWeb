import { describe, expect, it } from "vitest";
import { sessionWriteAccess } from "@/lib/training/session-access";

describe("session write access", () => {
  it("allows the owner of a session that is still in progress", () => {
    expect(sessionWriteAccess({ athleteId: "athlete", status: "IN_PROGRESS" }, "athlete")).toEqual({ ok: true });
  });

  it("hides a missing session, rejects another athlete, and freezes a closed session", () => {
    expect(sessionWriteAccess(null, "athlete")).toEqual({ ok: false, status: 404 });
    expect(sessionWriteAccess({ athleteId: "owner", status: "IN_PROGRESS" }, "other")).toEqual({ ok: false, status: 403 });
    expect(sessionWriteAccess({ athleteId: "athlete", status: "ABANDONED" }, "athlete")).toEqual({ ok: false, status: 409 });
    expect(sessionWriteAccess({ athleteId: "athlete", status: "COMPLETED" }, "athlete")).toEqual({ ok: false, status: 409 });
  });
});
