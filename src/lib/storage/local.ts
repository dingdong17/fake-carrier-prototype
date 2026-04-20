import { writeFileSync, readFileSync, rmSync, mkdirSync, existsSync } from "fs";
import { dirname, join, normalize, isAbsolute } from "path";
import type { Storage, StoredObject } from "./types";

function safeKey(key: string): string {
  const n = normalize(key);
  if (n.startsWith("..") || isAbsolute(n)) {
    throw new Error(`unsafe storage key: ${key}`);
  }
  return n;
}

export class LocalStorage implements Storage {
  constructor(private readonly root: string) {}

  async put(
    path: string,
    body: Buffer,
    _contentType: string
  ): Promise<StoredObject> {
    const key = safeKey(path);
    const abs = join(this.root, key);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
    return { key, url: `file://${abs}`, size: body.length };
  }

  async get(key: string): Promise<Buffer> {
    const abs = join(this.root, safeKey(key));
    return readFileSync(abs);
  }

  async delete(key: string): Promise<void> {
    const abs = join(this.root, safeKey(key));
    if (existsSync(abs)) rmSync(abs);
  }

  async deletePrefix(prefix: string): Promise<void> {
    const abs = join(this.root, safeKey(prefix));
    if (existsSync(abs)) rmSync(abs, { recursive: true, force: true });
  }
}
