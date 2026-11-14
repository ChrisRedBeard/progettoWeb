import { describe, expect, it } from "vitest";
import { CONSENT_VERSION, consentIsCurrent } from "@/lib/consent";

describe("consentIsCurrent", () => {
  it("asks again when the stored version differs", () => {
    const at = new Date("2026-11-13T12:00:00.000Z");
    expect(consentIsCurrent(at, CONSENT_VERSION)).toBe(true);
    expect(consentIsCurrent(at, "2020-01-01")).toBe(false);
    expect(consentIsCurrent(null, CONSENT_VERSION)).toBe(false);
    expect(consentIsCurrent(at, null)).toBe(false);
  });
});
