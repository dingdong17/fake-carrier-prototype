import { put, del, list, head, get } from "@vercel/blob";
import type { Storage, StoredObject } from "./types";

export class BlobStorage implements Storage {
  constructor(private readonly token: string) {}

  async put(
    path: string,
    body: Buffer,
    contentType: string
  ): Promise<StoredObject> {
    const res = await put(path, body, {
      access: "private",
      contentType,
      token: this.token,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return { key: res.pathname, url: res.url, size: body.length };
  }

  async get(key: string): Promise<Buffer> {
    const res = await get(key, { access: "private", token: this.token });
    if (!res) {
      throw new Error(`Blob not found: ${key}`);
    }
    if (res.statusCode !== 200) {
      throw new Error(`Blob fetch failed: status ${res.statusCode} ${key}`);
    }
    const chunks: Uint8Array[] = [];
    const reader = res.stream.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c)));
  }

  async delete(key: string): Promise<void> {
    const meta = await head(key, { token: this.token }).catch(() => null);
    if (meta) await del(meta.url, { token: this.token });
  }

  async deletePrefix(prefix: string): Promise<void> {
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, token: this.token });
      if (page.blobs.length > 0) {
        await del(
          page.blobs.map((b) => b.url),
          { token: this.token }
        );
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  }
}
