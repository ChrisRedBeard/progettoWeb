import type { SetResultBody } from "@/lib/validators/training";
import type { VoiceMode } from "@/lib/integrations/types";

export type OutboxJob =
  | { id: string; kind: "set"; sessionId: string; body: SetResultBody; createdAt: number }
  | { id: string; kind: "abandon"; sessionId: string; createdAt: number }
  | { id: string; kind: "feedback"; mode: VoiceMode; sessionId: string | null; createdAt: number };

export interface OutboxStore {
  put(job: OutboxJob): Promise<void>;
  list(): Promise<OutboxJob[]>;
  delete(id: string): Promise<void>;
}

export function createMemoryOutbox(): OutboxStore {
  const jobs = new Map<string, OutboxJob>();
  return {
    async put(job) {
      jobs.set(job.id, job);
    },
    async list() {
      return [...jobs.values()].sort((left, right) => left.createdAt - right.createdAt);
    },
    async delete(id) {
      jobs.delete(id);
    },
  };
}

export async function flushOutbox(store: OutboxStore, send: (job: OutboxJob) => Promise<boolean>) {
  const jobs = await store.list();
  for (const job of jobs) {
    const delivered = await send(job);
    if (!delivered) break;
    await store.delete(job.id);
  }
  return store.list();
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function createIndexedDbOutbox(): OutboxStore {
  let opening: Promise<IDBDatabase> | null = null;

  function open() {
    opening ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("fit-ai", 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("outbox")) {
          database.createObjectStore("outbox", { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return opening;
  }

  return {
    async put(job) {
      const database = await open();
      const transaction = database.transaction("outbox", "readwrite");
      transaction.objectStore("outbox").put(job);
      await transactionDone(transaction);
    },
    async list() {
      const database = await open();
      const transaction = database.transaction("outbox", "readonly");
      const jobs = await requestToPromise(transaction.objectStore("outbox").getAll());
      await transactionDone(transaction);
      return (jobs as OutboxJob[]).sort((left, right) => left.createdAt - right.createdAt);
    },
    async delete(id) {
      const database = await open();
      const transaction = database.transaction("outbox", "readwrite");
      transaction.objectStore("outbox").delete(id);
      await transactionDone(transaction);
    },
  };
}

export async function openOutbox(): Promise<OutboxStore> {
  if (typeof indexedDB === "undefined") return createMemoryOutbox();
  try {
    const store = createIndexedDbOutbox();
    await store.list();
    return store;
  } catch {
    return createMemoryOutbox();
  }
}
