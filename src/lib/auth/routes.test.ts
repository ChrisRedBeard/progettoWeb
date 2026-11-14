import { describe, expect, it } from "vitest";
import { accessStatus, decideAccess, devRoutesAllowed, safeCallback } from "@/lib/auth/routes";

const devPaths = ["/dev", "/dev/integrations", "/dev/other", "/api/dev", "/api/dev/lobby-notice"];
const roles = [null, "ATHLETE", "COACH"] as const;

describe("dev routes", () => {
  it("answers 404 for every /dev path when NODE_ENV is production", () => {
    expect(devRoutesAllowed("production")).toBe(false);

    for (const pathname of devPaths) {
      for (const role of roles) {
        const decision = decideAccess(pathname, role, {
          allowDevRoutes: devRoutesAllowed("production"),
        });
        expect(decision).toEqual({ type: "notFound" });
        expect(accessStatus(decision, pathname)).toBe(404);
      }
    }
  });

  it("allows /dev only when development opens it", () => {
    expect(devRoutesAllowed("development")).toBe(true);
    expect(decideAccess("/dev/integrations", null, { allowDevRoutes: true })).toEqual({ type: "allow" });
    expect(accessStatus({ type: "allow" }, "/dev/integrations")).toBe(200);
  });
});

describe("safeCallback", () => {
  it("returns an invite path for either role and drops the query", () => {
    expect(safeCallback("/invite/abc?x=1", "ATHLETE")).toBe("/invite/abc");
    expect(safeCallback("/invite/abc", "COACH")).toBe("/invite/abc");
    expect(safeCallback("//invite/abc", "ATHLETE")).toBe("/explore");
    expect(safeCallback("/lobby", "ATHLETE")).toBe("/explore");
  });

  it("lets a signed video url through without a session", () => {
    expect(decideAccess("/api/storage/file", null)).toEqual({ type: "allow" });
    expect(decideAccess("/api/storage/upload", null)).toEqual({ type: "allow" });
  });

  it("sends a logged-in user back to the invite instead of home", () => {
    expect(decideAccess("/login", "ATHLETE", { callbackUrl: "/invite/token" })).toEqual({
      type: "redirect",
      to: "/invite/token",
    });
  });
});
