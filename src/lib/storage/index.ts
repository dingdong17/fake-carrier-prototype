import path from "path";
import { LocalStorage } from "./local";
import type { Storage } from "./types";

let _storage: Storage | null = null;

export function getStorage(): Storage {
  if (_storage) return _storage;
  const driver = process.env.STORAGE_DRIVER || "local";
  if (driver === "local") {
    const root =
      process.env.STORAGE_LOCAL_ROOT ||
      path.join(process.cwd(), "uploads");
    _storage = new LocalStorage(root);
  } else {
    throw new Error(`Unknown STORAGE_DRIVER: ${driver}`);
  }
  return _storage;
}

export type { Storage, StoredObject } from "./types";
