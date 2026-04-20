import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { LocalStorage } from "./local";

describe("LocalStorage", () => {
  let root: string;
  let storage: LocalStorage;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "fc-storage-test-"));
    storage = new LocalStorage(root);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("put + get round-trips the same bytes", async () => {
    const body = Buffer.from("hallo welt");
    const obj = await storage.put("checks/abc/doc1.txt", body, "text/plain");
    expect(obj.size).toBe(body.length);
    const got = await storage.get(obj.key);
    expect(got.toString("utf-8")).toBe("hallo welt");
  });

  it("put creates nested directories as needed", async () => {
    await storage.put("a/b/c/d.bin", Buffer.from([1, 2, 3]), "application/octet-stream");
    expect(existsSync(join(root, "a/b/c/d.bin"))).toBe(true);
  });

  it("delete removes the file", async () => {
    const obj = await storage.put("x.txt", Buffer.from("x"), "text/plain");
    await storage.delete(obj.key);
    expect(existsSync(join(root, "x.txt"))).toBe(false);
  });

  it("deletePrefix removes a whole subtree", async () => {
    await storage.put("checks/abc/a.txt", Buffer.from("a"), "text/plain");
    await storage.put("checks/abc/b.txt", Buffer.from("b"), "text/plain");
    await storage.put("checks/xyz/c.txt", Buffer.from("c"), "text/plain");
    await storage.deletePrefix("checks/abc");
    expect(existsSync(join(root, "checks/abc"))).toBe(false);
    expect(existsSync(join(root, "checks/xyz/c.txt"))).toBe(true);
  });
});
