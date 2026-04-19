import path from "path";
import { LocalStorage } from "./local";
import { BlobStorage } from "./blob";
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
  } else if (driver === "blob") {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new Error(
        "STORAGE_DRIVER=blob but BLOB_READ_WRITE_TOKEN is not set"
      );
    }
    _storage = new BlobStorage(token);
  } else {
    throw new Error(`Unknown STORAGE_DRIVER: ${driver}`);
  }
  return _storage;
}

export type { Storage, StoredObject } from "./types";
