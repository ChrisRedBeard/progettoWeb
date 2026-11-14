import { describe, expect, it } from "vitest";
import { createMemoryOutbox, flushOutbox, type OutboxJob } from "@/lib/training/outbox";

function job(id: string, createdAt: number): OutboxJob {
  return { id, kind: "abandon", sessionId: "session", createdAt };
}

describe("outbox", () => {
  it("sends queued jobs in order and removes them", async () => {
    const store = createMemoryOutbox();
    await store.put(job("b", 2));
    await store.put(job("a", 1));
    const sent: string[] = [];
    const left = await flushOutbox(store, async (item) => {
      sent.push(item.id);
      return true;
    });
    expect(sent).toEqual(["a", "b"]);
    expect(left).toEqual([]);
  });

  it("stops at the first failure and keeps that job", async () => {
    const store = createMemoryOutbox();
    await store.put(job("a", 1));
    await store.put(job("b", 2));
    const left = await flushOutbox(store, async (item) => item.id !== "a");
    expect(left.map((item) => item.id)).toEqual(["a", "b"]);
  });
});
