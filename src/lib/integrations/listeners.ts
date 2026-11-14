import type { Unsubscribe } from "@/lib/integrations/types";

export function createListeners<A extends unknown[]>() {
  const items = new Set<(...args: A) => void>();
  return {
    add(listener: (...args: A) => void): Unsubscribe {
      items.add(listener);
      return () => {
        items.delete(listener);
      };
    },
    emit(...args: A) {
      for (const listener of [...items]) listener(...args);
    },
  };
}
