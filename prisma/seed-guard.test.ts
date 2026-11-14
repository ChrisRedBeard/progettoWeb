import { afterEach, describe, expect, it, vi } from "vitest";
import { refuseProductionSeed } from "./seed-guard";

describe("seed guard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refuses to run in production", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });
    expect(() => refuseProductionSeed("production")).toThrow("exit");
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("allows every other environment", () => {
    expect(() => refuseProductionSeed("test")).not.toThrow();
    expect(() => refuseProductionSeed(undefined)).not.toThrow();
  });
});
