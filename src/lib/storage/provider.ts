import { localStorageProvider } from "@/lib/storage/local";
import type { StorageProvider } from "@/lib/storage/types";

export function getStorage(): StorageProvider {
  return localStorageProvider;
}
