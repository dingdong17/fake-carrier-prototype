import { describe, it, expect } from "vitest";
import { BlobStorage } from "./blob";

const token = process.env.BLOB_READ_WRITE_TOKEN;
const describeIf = token ? describe : describe.skip;

describeIf("BlobStorage (integration — requires BLOB_READ_WRITE_TOKEN)", () => {
  const storage = new BlobStorage(token!);
  const key = `test/${Date.now()}-fc-blob.txt`;

  it("put + get round-trips bytes", async () => {
    const body = Buffer.from("hallo blob");
    const obj = await storage.put(key, body, "text/plain");
    expect(obj.size).toBe(body.length);
    const got = await storage.get(obj.key);
    expect(got.toString("utf-8")).toBe("hallo blob");
  });

  it("delete removes the blob", async () => {
    await storage.delete(key);
  });
}, 30_000);
