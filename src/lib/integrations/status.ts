import type { IntegrationError } from "@/lib/integrations/errors";
import type { IntegrationStatus, StatusListener, Unsubscribe } from "@/lib/integrations/types";

export function createStatus() {
  let status: IntegrationStatus = "idle";
  let lastError: IntegrationError | null = null;
  const listeners = new Set<StatusListener>();

  return {
    get status() {
      return status;
    },
    get lastError() {
      return lastError;
    },
    set(next: IntegrationStatus, error: IntegrationError | null = null) {
      const resolved = next === "error" ? error : null;
      if (next === status && resolved === lastError) return;
      status = next;
      lastError = resolved;
      for (const listener of [...listeners]) listener(status, lastError);
    },
    onStatusChange(listener: StatusListener): Unsubscribe {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
