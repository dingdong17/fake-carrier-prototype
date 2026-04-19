# Vercel Deployment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move FakeCarrier from local-Mac-only to Vercel so Don and colleagues can access it from anywhere, with Turso as the database and Vercel Blob for document storage. Closes BL-015.

**Architecture:** The app ships as a serverless Next.js project on Vercel. Persistence moves from a local SQLite file to a Turso (libSQL) cloud database accessed via `drizzle-orm/libsql` — all DB calls become async. Uploaded documents move from the local `uploads/` directory to Vercel Blob; analysis code reads them via HTTPS. Python (`pypdf`) and `pdftoppm` system dependencies are removed in favor of JS-native PDF text extraction (`pdf-parse`, already installed). PDF **rasterization is dropped** — small PDFs that previously went through visual analysis now go through the same text-extraction path, trading 3 visual risk signals (`generic-form`, `missing-logo`, `missing-signature`) for a dependency-free serverless runtime. Analytics moves from `logs/analytics.log` to `console.log` (captured by Vercel) plus a new `analytics_events` table in Turso for queryable history. All six phases can ship to `main` independently; the app keeps running locally after each phase.

**Tech Stack:** Next.js 16.2.3 (App Router, React 19), Drizzle ORM, `@libsql/client`, `@vercel/blob`, `pdf-parse`, vitest. Existing Azure OpenAI integration (`openai@6.34.0`) untouched.

---

## Scope & decisions

### In scope
- Swap Python + poppler PDF tooling for JS-native (Phase 1)
- File storage abstraction + Vercel Blob implementation (Phases 2–3)
- SQLite → Turso with full async refactor (Phase 4)
- Analytics logging to console + DB (Phase 5)
- First Vercel deployment with env + timeouts + preview smoke test (Phase 6)

### Out of scope
- Auth / multi-tenant access (covered by BL-009, BL-010)
- Entra ID for Azure OpenAI (separate backlog item — key-based auth stays)
- Custom domain, redirects, CDN config
- CI pipelines beyond Vercel's default preview deploys
- PDF rasterization on Vercel — see **Decision 1** below

### Key decisions

**Decision 1 — PDF rasterization: DROP on serverless.**
On Vercel functions, neither `pdftoppm` (system binary) nor `pdfjs-dist`+`canvas` (native module friction) is production-reliable. We route *all* PDFs through text extraction via `pdf-parse`. Visual-only risk signals (`generic-form`, `missing-logo`, `missing-signature`) will fire less reliably on small PDFs. File **BL-040** to reinstate rasterization via an external service (e.g. separate container with poppler) if the signal loss proves material.

**Decision 2 — Database: Turso (libSQL).**
Preserves SQLite dialect → minimal schema rewrite, matches BL-015, generous free tier, edge-read performant. Alternative considered: Vercel Postgres / Neon — rejected because the schema and drizzle-orm usage are SQLite-flavored; switching dialects is more churn than staying on libSQL.

**Decision 3 — File storage: Vercel Blob.**
Zero-config in a Vercel project, TS SDK, HTTPS reads work from any runtime. Alternative considered: Cloudflare R2 / S3 — rejected to minimize account/credential sprawl for MVP.

**Decision 4 — DB API becomes async everywhere.**
`better-sqlite3` exposes sync methods (`.get()`, `.all()`, `.run()`). `@libsql/client` is promise-based. Every drizzle call site becomes `await`-ed. This is the single biggest change in the plan. Acceptance: typecheck + full test suite still pass.

---

## Pre-flight

### Task 0: Commit pending work + create worktree

Current working tree has the Azure migration + nav-blocker feature uncommitted. Ship those first so the Vercel migration starts from a clean baseline.

**Files:**
- None modified here; git operations only.

- [ ] **Step 0.1:** Review current working tree
  ```bash
  git status
  git diff --stat
  ```
  Expected: Azure migration files (`src/lib/azure-openai.ts`, `src/lib/analysis/providers/azure-document.ts*`, modified routes) + nav-blocker files (`src/lib/navigation-blocker.tsx`, `src/app/api/check/[id]/discard/route.ts`, modified `nav-links.tsx`, `layout.tsx`, `check/page.tsx`) should all be present.

- [ ] **Step 0.2:** Commit Azure migration as one commit
  ```bash
  git add package.json package-lock.json src/lib/azure-openai.ts \
    src/lib/analysis/providers/azure-document.ts \
    src/lib/analysis/providers/azure-document.test.ts \
    src/lib/analysis/pipeline.ts \
    src/app/api/chat/route.ts \
    src/app/api/classify/route.ts \
    src/app/api/analyze/route.ts \
    src/lib/analysis/forensic.test.ts
  git rm src/lib/analysis/providers/claude-document.ts \
         src/lib/analysis/providers/claude-document.test.ts
  git commit -m "feat: migrate Claude API to Azure OpenAI (gpt-5.2)"
  ```

- [ ] **Step 0.3:** Commit nav-blocker as a second commit
  ```bash
  git add src/lib/navigation-blocker.tsx \
          src/app/api/check/[id]/discard/route.ts \
          src/app/layout.tsx \
          src/components/layout/nav-links.tsx \
          src/app/check/page.tsx
  git commit -m "feat: warn + optional discard on navigation during in-progress check"
  ```

- [ ] **Step 0.4:** Create worktree for Vercel migration
  ```bash
  git worktree add .worktrees/vercel-deploy -b feat/vercel-deploy
  cd .worktrees/vercel-deploy
  ```

- [ ] **Step 0.5:** Verify baseline in worktree
  ```bash
  npm install --legacy-peer-deps
  npx tsc --noEmit
  npm test
  ```
  Expected: 161/161 tests pass, typecheck clean.

---

## Phase 1 — Remove Python + poppler PDF tooling

**Goal:** No more `execSync`-ing to Python or `pdftoppm`. All PDF handling via JS.

### Task 1: Swap `pypdf` text extraction for `pdf-parse`

`pdf-parse` is already a dependency (see `package.json`).

**Files:**
- Modify: `src/lib/analysis/providers/azure-document.ts` — replace `extractPdfText` implementation

- [ ] **Step 1.1:** Write a characterization test against a real sample

  Append to `src/lib/analysis/providers/azure-document.test.ts`:

  ```typescript
  import { describe, it, expect } from "vitest";
  import { readFileSync, statSync } from "fs";
  import path from "path";

  // buildSmartContent isn't exported, so we test extractPdfText indirectly
  // via a new exported helper we'll add in Step 1.2
  describe("azure-document PDF text extraction", () => {
    it("extracts text from a sample insurance PDF (pdf-parse)", async () => {
      const mod = await import("./azure-document");
      const samplePath = path.join(
        process.cwd(),
        "Samples/Versicherungsbestatigung-verkehrshaftung-2025.pdf"
      );
      // Guard: only run if the sample exists in this working copy
      try {
        statSync(samplePath);
      } catch {
        console.warn("skipping: sample PDF not present");
        return;
      }
      const text = await mod.extractPdfText(samplePath, 5);
      expect(text).toBeTruthy();
      expect(text!.length).toBeGreaterThan(500);
      expect(text).toContain("Versicherung");
    });
  });
  ```

- [ ] **Step 1.2:** Run to confirm it fails (function not exported yet)
  ```bash
  npx vitest run src/lib/analysis/providers/azure-document.test.ts
  ```
  Expected: 1 failure, "mod.extractPdfText is not a function".

- [ ] **Step 1.3:** Replace `extractPdfText` in `src/lib/analysis/providers/azure-document.ts`

  Delete the existing `extractPdfText` function (lines roughly 63–90 — the one that calls `execSync('python3 ...')`) and replace with:

  ```typescript
  import pdf from "pdf-parse";

  export async function extractPdfText(
    filePath: string,
    maxPages: number = 5
  ): Promise<string | null> {
    try {
      const buffer = readFileSync(filePath);
      const result = await pdf(buffer, { max: maxPages });
      const text = result.text?.trim();
      if (!text || text.length < 100) return null;
      console.log(
        `[pdf-text] Extracted ${text.length} chars from ${result.numpages} pages (limit ${maxPages})`
      );
      return text;
    } catch (err) {
      console.log(`[pdf-text] pdf-parse failed: ${err}`);
      return null;
    }
  }
  ```

  Note: the function is now `export`ed for the test. Delete the `import { execSync } from "child_process"` at the top of the file (no longer needed).

- [ ] **Step 1.4:** Run the new test
  ```bash
  npx vitest run src/lib/analysis/providers/azure-document.test.ts
  ```
  Expected: PASS.

- [ ] **Step 1.5:** Commit
  ```bash
  git add src/lib/analysis/providers/azure-document.ts \
          src/lib/analysis/providers/azure-document.test.ts
  git commit -m "refactor: replace pypdf (execSync python3) with pdf-parse for PDF text extraction"
  ```

### Task 2: Drop PDF rasterization fallback (small PDFs also text-extract)

This removes the `pdftoppm` binary dependency. Small PDFs will now text-extract like large ones. The `PDF_SIZE_THRESHOLD_KB` threshold becomes irrelevant.

**Files:**
- Modify: `src/lib/analysis/providers/azure-document.ts`

- [ ] **Step 2.1:** Simplify `buildSmartContent` in `azure-document.ts`

  Replace the entire `buildSmartContent` function and all its helpers (`rasterizePdf`, `RASTER_DPI`, `RASTER_MAX_PAGES`, `PDF_SIZE_THRESHOLD_KB`, `ImageContent`/`TextContent`/`UserContent` types, `mkdtempSync`/`rmSync` imports) with:

  ```typescript
  type ImageContent = { type: "image_url"; image_url: { url: string } };
  type TextContent = { type: "text"; text: string };
  type UserContent = ImageContent | TextContent;

  async function buildSmartContent(
    filePath: string,
    mimeType: string
  ): Promise<{ content: UserContent[]; cleanup?: () => void }> {
    if (isPdf(mimeType)) {
      const text = await extractPdfText(filePath, 5);
      if (text) {
        return {
          content: [
            { type: "text", text: `[Dokumentinhalt - Erste Seiten]\n\n${text}` },
          ],
        };
      }
      throw new Error(
        "PDF-Textextraktion fehlgeschlagen. Bitte Dokument als Bild hochladen."
      );
    }

    const b64 = readFileSync(filePath).toString("base64");
    return {
      content: [
        {
          type: "image_url",
          image_url: {
            url: `data:${normalizeImageMime(mimeType)};base64,${b64}`,
          },
        },
      ],
    };
  }
  ```

  Also remove the now-unused `mkdtempSync` and `rmSync` imports from `"fs"` and the `tmpdir`/`join`/`os` imports if nothing else uses them.

- [ ] **Step 2.2:** Run typecheck + tests
  ```bash
  npx tsc --noEmit && npm test
  ```
  Expected: typecheck clean, 161/161 tests pass.

- [ ] **Step 2.3:** Run end-to-end against a sample to confirm extraction quality hasn't regressed

  ```bash
  # In one shell
  npm run dev
  ```
  Then in another shell:
  ```bash
  UPLOAD=$(curl -s -X POST http://localhost:3000/api/upload \
    -F "files=@Samples/Versicherungsbestatigung-verkehrshaftung-2025.pdf" \
    -F "carrierName=Test GmbH" -F "testSet=quick")
  DOC_ID=$(echo "$UPLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin)['documents'][0]['id'])")
  curl -s -X POST http://localhost:3000/api/classify \
    -H "Content-Type: application/json" \
    -d "{\"documentId\":\"$DOC_ID\"}" | python3 -m json.tool
  ```
  Expected: `documentType: "insurance-cert"`, extracted fields populated. Note the absence of visual-only risk signals (`generic-form`/`missing-logo`) — that is the documented tradeoff.

- [ ] **Step 2.4:** Commit
  ```bash
  git add src/lib/analysis/providers/azure-document.ts
  git commit -m "refactor: drop pdftoppm rasterization — route all PDFs through text extraction"
  ```

- [ ] **Step 2.5:** Verify Python + poppler are no longer required

  ```bash
  grep -rn "execSync\|python3\|pdftoppm" src/
  ```
  Expected: no matches.

---

## Phase 2 — File storage abstraction (interface first, local impl)

**Goal:** Insert a storage interface between the app code and the filesystem so Phase 3 can swap in Vercel Blob without touching call sites.

### Task 3: Define the `Storage` interface

**Files:**
- Create: `src/lib/storage/types.ts`
- Create: `src/lib/storage/types.test.ts`

- [ ] **Step 3.1:** Write a failing test in `src/lib/storage/types.test.ts`:

  ```typescript
  import { describe, it, expect } from "vitest";
  import type { Storage, StoredObject } from "./types";

  describe("Storage interface", () => {
    it("exposes the expected method signatures via a type check", () => {
      // This test exists only to ensure the module compiles with the interface present.
      // If either import resolves to undefined at runtime, this will throw.
      const marker: Storage | null = null;
      const obj: StoredObject | null = null;
      expect(marker).toBeNull();
      expect(obj).toBeNull();
    });
  });
  ```

- [ ] **Step 3.2:** Run to confirm failure
  ```bash
  npx vitest run src/lib/storage/types.test.ts
  ```
  Expected: compile error, module not found.

- [ ] **Step 3.3:** Create `src/lib/storage/types.ts`:

  ```typescript
  export interface StoredObject {
    /** Provider-internal key (e.g. filesystem path or blob key). Stable across reads. */
    key: string;
    /** URL the server can read the object from. For local: file:// path. For blob: https URL. */
    url: string;
    /** Original file size in bytes at upload time. */
    size: number;
  }

  export interface Storage {
    /** Persist bytes under a logical path (e.g. "checks/<id>/<docId>.pdf"). */
    put(
      path: string,
      body: Buffer,
      contentType: string
    ): Promise<StoredObject>;

    /** Fetch the object back as a buffer, given its key. */
    get(key: string): Promise<Buffer>;

    /** Delete the object and, if the provider supports it, any empty parent prefixes. */
    delete(key: string): Promise<void>;

    /** Recursively delete everything under the given prefix. Used by /api/check/[id]/discard. */
    deletePrefix(prefix: string): Promise<void>;
  }
  ```

- [ ] **Step 3.4:** Run test to verify it passes
  ```bash
  npx vitest run src/lib/storage/types.test.ts
  ```
  Expected: PASS.

- [ ] **Step 3.5:** Commit
  ```bash
  git add src/lib/storage/types.ts src/lib/storage/types.test.ts
  git commit -m "feat(storage): define Storage interface for file persistence"
  ```

### Task 4: Local-filesystem implementation

Wraps the existing `uploads/` directory behavior behind the interface.

**Files:**
- Create: `src/lib/storage/local.ts`
- Create: `src/lib/storage/local.test.ts`

- [ ] **Step 4.1:** Write the test in `src/lib/storage/local.test.ts`:

  ```typescript
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
  ```

- [ ] **Step 4.2:** Run to confirm failure
  ```bash
  npx vitest run src/lib/storage/local.test.ts
  ```
  Expected: module not found.

- [ ] **Step 4.3:** Implement `src/lib/storage/local.ts`:

  ```typescript
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
  ```

- [ ] **Step 4.4:** Run tests
  ```bash
  npx vitest run src/lib/storage/local.test.ts
  ```
  Expected: 4 PASS.

- [ ] **Step 4.5:** Commit
  ```bash
  git add src/lib/storage/local.ts src/lib/storage/local.test.ts
  git commit -m "feat(storage): LocalStorage implementation backed by the filesystem"
  ```

### Task 5: Storage factory + singleton

**Files:**
- Create: `src/lib/storage/index.ts`

- [ ] **Step 5.1:** Write `src/lib/storage/index.ts`:

  ```typescript
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
  ```

- [ ] **Step 5.2:** Commit
  ```bash
  git add src/lib/storage/index.ts
  git commit -m "feat(storage): factory returning LocalStorage by default"
  ```

### Task 6: Route `/api/upload` through the Storage interface

**Files:**
- Modify: `src/app/api/upload/route.ts`

- [ ] **Step 6.1:** In `src/app/api/upload/route.ts`, replace the filesystem writes with a storage call.

  Remove imports:
  ```typescript
  import { writeFileSync, mkdirSync, existsSync } from "fs";
  import path from "path";
  ```

  Add:
  ```typescript
  import { getStorage } from "@/lib/storage";
  ```

  Delete the "Ensure uploads directory exists" block (around lines 87–91 of the current file) entirely.

  Inside the `for (const file of files)` loop, replace the `writeFileSync(filePath, buffer)` block with:

  ```typescript
  const ext = path.extname(file.name) || ".bin";  // keep this
  const savedFileName = `${docId}${ext}`;
  const key = `checks/${resolvedCheckId}/${savedFileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const stored = await getStorage().put(
    key,
    buffer,
    file.type || "application/octet-stream"
  );

  db.insert(documents)
    .values({
      id: docId,
      checkId: resolvedCheckId,
      documentType: "unknown",
      fileName: file.name,
      filePath: stored.key, // was the absolute local path; now the storage key
      mimeType: file.type || "application/octet-stream",
      status: "uploaded",
    })
    .run();

  savedDocuments.push({
    id: docId,
    fileName: file.name,
    filePath: stored.key,
    mimeType: file.type || "application/octet-stream",
    documentType: "unknown",
    status: "uploaded",
  });
  ```

  Re-add the `path` import at the top since we still use `path.extname`:
  ```typescript
  import path from "path";
  ```

  Delete the `uploadDir` variable and any lingering references.

- [ ] **Step 6.2:** Run typecheck + tests + smoke upload
  ```bash
  npx tsc --noEmit && npm test
  # then in one shell: npm run dev
  # and curl an upload
  curl -s -X POST http://localhost:3000/api/upload \
    -F "files=@Samples/Versicherungsbestatigung-verkehrshaftung-2025.pdf" \
    -F "carrierName=Test" -F "testSet=quick" | python3 -m json.tool
  ```
  Expected: `filePath` in the response is now `"checks/<id>/<docId>.pdf"` (relative key), not an absolute path.

- [ ] **Step 6.3:** Commit
  ```bash
  git add src/app/api/upload/route.ts
  git commit -m "refactor: /api/upload writes via Storage interface"
  ```

### Task 7: Route `azure-document.ts` reads through the Storage interface

The provider currently reads via `readFileSync(documentPath)`. Change it to read bytes via the storage interface so it works against both local and blob backends.

**Files:**
- Modify: `src/lib/analysis/providers/azure-document.ts`
- Modify: `src/lib/analysis/pipeline.ts`

- [ ] **Step 7.1:** Add a helper that loads bytes to a temp path for PDF parsing.

  `pdf-parse` accepts a Buffer directly, so most of the code doesn't need a temp file. Refactor `buildSmartContent` and `extractPdfText` to take a Buffer rather than a file path:

  ```typescript
  // In azure-document.ts

  export async function extractPdfText(
    buffer: Buffer,
    maxPages: number = 5
  ): Promise<string | null> {
    try {
      const result = await pdf(buffer, { max: maxPages });
      const text = result.text?.trim();
      if (!text || text.length < 100) return null;
      console.log(
        `[pdf-text] Extracted ${text.length} chars from ${result.numpages} pages (limit ${maxPages})`
      );
      return text;
    } catch (err) {
      console.log(`[pdf-text] pdf-parse failed: ${err}`);
      return null;
    }
  }

  async function buildSmartContent(
    buffer: Buffer,
    mimeType: string
  ): Promise<{ content: UserContent[] }> {
    if (isPdf(mimeType)) {
      const text = await extractPdfText(buffer, 5);
      if (text) {
        return {
          content: [
            { type: "text", text: `[Dokumentinhalt - Erste Seiten]\n\n${text}` },
          ],
        };
      }
      throw new Error(
        "PDF-Textextraktion fehlgeschlagen. Bitte Dokument als Bild hochladen."
      );
    }
    const b64 = buffer.toString("base64");
    return {
      content: [
        {
          type: "image_url",
          image_url: {
            url: `data:${normalizeImageMime(mimeType)};base64,${b64}`,
          },
        },
      ],
    };
  }
  ```

  Replace all `statSync(documentPath).size / 1024` calls (line ~195 and ~240 in current file) with `buffer.length / 1024` using the buffer we now load up front.

- [ ] **Step 7.2:** At the top of `classifyDocument` and `azureDocumentProvider.analyze`, load bytes via the storage interface:

  ```typescript
  import { getStorage } from "@/lib/storage";

  // Inside classifyDocument:
  const buffer = await getStorage().get(documentPath);
  const fileSizeKB = Math.round(buffer.length / 1024);
  const { content } = await buildSmartContent(buffer, mimeType);
  // no cleanup needed — all in-memory

  // Same pattern inside azureDocumentProvider.analyze.
  ```

  Remove `readFileSync` and `statSync` from the "fs" imports.

- [ ] **Step 7.3:** In `src/lib/analysis/pipeline.ts`, replace `readFileSync(filePath)` inside `analyzeDocumentWithForensics` with `await getStorage().get(filePath)`:

  ```typescript
  import { getStorage } from "@/lib/storage";

  // inside analyzeDocumentWithForensics:
  try {
    const buffer = await getStorage().get(filePath);
    return await applyForensicAnalysis(result, buffer, mimeType);
  } catch {
    return result;
  }
  ```

- [ ] **Step 7.4:** Update the existing PDF-text test in `azure-document.test.ts` (from Task 1) to call `extractPdfText` with a Buffer rather than a path:

  ```typescript
  it("extracts text from a sample insurance PDF (pdf-parse)", async () => {
    const mod = await import("./azure-document");
    const samplePath = path.join(
      process.cwd(),
      "Samples/Versicherungsbestatigung-verkehrshaftung-2025.pdf"
    );
    try { statSync(samplePath); } catch { return; }
    const buffer = readFileSync(samplePath);
    const text = await mod.extractPdfText(buffer, 5);
    expect(text).toBeTruthy();
    expect(text).toContain("Versicherung");
  });
  ```

- [ ] **Step 7.5:** Typecheck + tests + end-to-end smoke test

  ```bash
  npx tsc --noEmit && npm test
  ```
  Then repeat the upload + classify flow from Task 2 Step 2.3 and confirm extraction still works.

- [ ] **Step 7.6:** Commit
  ```bash
  git add src/lib/analysis/providers/azure-document.ts \
          src/lib/analysis/providers/azure-document.test.ts \
          src/lib/analysis/pipeline.ts
  git commit -m "refactor: provider + pipeline read documents via Storage interface (buffer-based)"
  ```

### Task 8: Route `/api/check/[id]/discard` through storage

**Files:**
- Modify: `src/app/api/check/[id]/discard/route.ts`

- [ ] **Step 8.1:** Replace the `rmSync(uploadDir, { recursive: true, force: true })` block with:

  ```typescript
  import { getStorage } from "@/lib/storage";

  // replace the uploadDir block with:
  try {
    await getStorage().deletePrefix(`checks/${id}`);
  } catch (err) {
    console.warn(`[discard] deletePrefix failed for checks/${id}: ${err}`);
  }
  ```

  Remove `rmSync` and `path` imports if no longer used.

- [ ] **Step 8.2:** Typecheck + tests
  ```bash
  npx tsc --noEmit && npm test
  ```

- [ ] **Step 8.3:** Commit
  ```bash
  git add src/app/api/check/[id]/discard/route.ts
  git commit -m "refactor: /api/check/[id]/discard uses Storage.deletePrefix"
  ```

---

## Phase 3 — Vercel Blob implementation

**Goal:** Ship a `BlobStorage` class that implements the same `Storage` interface. Switch to it via `STORAGE_DRIVER=blob`.

### Task 9: Install + provision Vercel Blob

- [ ] **Step 9.1:** Install the SDK
  ```bash
  npm install --legacy-peer-deps @vercel/blob
  ```

- [ ] **Step 9.2:** Provision a Blob store

  In the Vercel dashboard (https://vercel.com/<team>/<project>/stores) → "Create Database" → "Blob" → name it `fakecarrier-docs`. Click "Connect to Project" once the project exists (Phase 6); until then, copy the `BLOB_READ_WRITE_TOKEN` into a note.

  Add to `.env.local`:
  ```
  BLOB_READ_WRITE_TOKEN=<paste from Vercel>
  ```
  (The `.env*` gitignore already protects this.)

### Task 10: `BlobStorage` implementation

**Files:**
- Create: `src/lib/storage/blob.ts`
- Create: `src/lib/storage/blob.test.ts` (manual integration — `.skip` by default)

- [ ] **Step 10.1:** Create `src/lib/storage/blob.ts`:

  ```typescript
  import { put, del, list, head } from "@vercel/blob";
  import type { Storage, StoredObject } from "./types";

  export class BlobStorage implements Storage {
    constructor(private readonly token: string) {}

    async put(
      path: string,
      body: Buffer,
      contentType: string
    ): Promise<StoredObject> {
      const res = await put(path, body, {
        access: "public",
        contentType,
        token: this.token,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      return { key: res.pathname, url: res.url, size: body.length };
    }

    async get(key: string): Promise<Buffer> {
      // For public blobs the URL is predictable via head(); fetch returns bytes.
      const meta = await head(key, { token: this.token });
      const res = await fetch(meta.url);
      if (!res.ok) {
        throw new Error(`Blob fetch failed: ${res.status} ${key}`);
      }
      const ab = await res.arrayBuffer();
      return Buffer.from(ab);
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
  ```

- [ ] **Step 10.2:** Extend the factory in `src/lib/storage/index.ts` to honor `STORAGE_DRIVER=blob`:

  ```typescript
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
  ```

- [ ] **Step 10.3:** Create an integration test (skipped by default) in `src/lib/storage/blob.test.ts`:

  ```typescript
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
  ```

- [ ] **Step 10.4:** Run the integration test locally
  ```bash
  npx vitest run src/lib/storage/blob.test.ts
  ```
  Expected: 2 PASS (assuming the token is in `.env.local` and vitest picks it up; otherwise the tests auto-skip).

- [ ] **Step 10.5:** Commit
  ```bash
  git add package.json package-lock.json \
          src/lib/storage/blob.ts src/lib/storage/blob.test.ts \
          src/lib/storage/index.ts
  git commit -m "feat(storage): Vercel Blob implementation behind the Storage interface"
  ```

### Task 11: Switch local dev to blob temporarily for shake-out

- [ ] **Step 11.1:** Set `STORAGE_DRIVER=blob` in `.env.local`. Restart dev server.

- [ ] **Step 11.2:** Run an end-to-end upload + classify flow (same as Task 2 Step 2.3). Confirm documents land in the Vercel Blob store (check the dashboard) and classification still succeeds.

- [ ] **Step 11.3:** Flip back to `STORAGE_DRIVER=local` (or remove the env var) so local dev doesn't consume Blob quota outside of verification runs.

---

## Phase 4 — SQLite → Turso (libSQL)

**Goal:** Replace `better-sqlite3` with `@libsql/client` + `drizzle-orm/libsql`. Every DB call becomes `await`.

### Task 12: Provision Turso + capture credentials

- [ ] **Step 12.1:** Install Turso CLI (once per machine)
  ```bash
  curl -sSfL https://get.tur.so/install.sh | bash
  turso --version
  ```

- [ ] **Step 12.2:** Log in and create the database
  ```bash
  turso auth login
  turso db create fakecarrier --location ams  # or fra for Frankfurt
  ```

- [ ] **Step 12.3:** Capture the connection details
  ```bash
  turso db show fakecarrier --url       # libsql://fakecarrier-<org>.turso.io
  turso db tokens create fakecarrier    # long JWT
  ```

- [ ] **Step 12.4:** Add to `.env.local`:
  ```
  TURSO_DATABASE_URL=libsql://fakecarrier-<org>.turso.io
  TURSO_AUTH_TOKEN=<paste>
  ```

### Task 13: Install + swap drizzle driver

**Files:**
- Modify: `package.json` (via npm)
- Modify: `src/lib/db/index.ts`
- Modify: `drizzle.config.ts`

- [ ] **Step 13.1:** Install + uninstall
  ```bash
  npm install --legacy-peer-deps @libsql/client
  npm uninstall --legacy-peer-deps better-sqlite3 @types/better-sqlite3
  ```

- [ ] **Step 13.2:** Replace `src/lib/db/index.ts`:

  ```typescript
  import { createClient } from "@libsql/client";
  import { drizzle } from "drizzle-orm/libsql";
  import * as schema from "./schema";

  const url = process.env.TURSO_DATABASE_URL || "file:./data/fakecarrier.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const client = createClient(
    authToken ? { url, authToken } : { url }
  );

  export const db = drizzle(client, { schema });
  ```

  Note: `file:./data/fakecarrier.db` works with libSQL locally — you can still run a local SQLite file during dev without Turso.

- [ ] **Step 13.3:** Update `drizzle.config.ts`:

  ```typescript
  import { defineConfig } from "drizzle-kit";

  export default defineConfig({
    schema: "./src/lib/db/schema.ts",
    out: "./drizzle",
    dialect: "turso",
    dbCredentials: {
      url: process.env.TURSO_DATABASE_URL || "file:./data/fakecarrier.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    },
  });
  ```

### Task 14: Convert every DB call site to async

This is the largest mechanical refactor in the plan. Every `db.select()... .get()`, `.all()`, `.run()` becomes `await`.

**Files affected (enumerate with `grep`):**
- [ ] **Step 14.1:** List all call sites
  ```bash
  grep -rn "db\.\(select\|insert\|update\|delete\)" src/ --include="*.ts" --include="*.tsx" | wc -l
  grep -rn "db\.\(select\|insert\|update\|delete\)" src/ --include="*.ts" --include="*.tsx" > /tmp/dbsites.txt
  cat /tmp/dbsites.txt | cut -d: -f1 | sort -u
  ```
  Expected: ~8–12 files. Typical hits: `src/app/api/upload/route.ts`, `src/app/api/analyze/route.ts`, `src/app/api/classify/route.ts`, `src/app/api/chat/route.ts`, `src/app/api/backlog/route.ts`, `src/app/api/check/[id]/discard/route.ts`, seed scripts, etc.

- [ ] **Step 14.2:** For each file in the list, convert synchronous DB calls to async.

  Mechanical rules:
  - `db.select()...(.get()|.all())` → prefix with `await`
  - `db.insert(...).values(...).run()` → prefix with `await`
  - `db.update(...).set(...).where(...).run()` → prefix with `await`
  - `db.delete(...).where(...).run()` → prefix with `await`
  - If the enclosing function isn't already `async`, mark it `async`.
  - For route handlers (`export async function POST/...`), they're already async — just add the `await`.

  Example (in `src/app/api/backlog/route.ts`, lines ~10–16):

  Before:
  ```typescript
  export async function GET() {
    const items = db
      .select()
      .from(backlogItems)
      .orderBy(asc(backlogItems.sortOrder))
      .all();
    return NextResponse.json({ items });
  }
  ```

  After:
  ```typescript
  export async function GET() {
    const items = await db
      .select()
      .from(backlogItems)
      .orderBy(asc(backlogItems.sortOrder))
      .all();
    return NextResponse.json({ items });
  }
  ```

  **Important:** For loop bodies that `await` inside synchronous collection iteration, pull them into proper async:
  ```typescript
  for (const doc of newDocs) { ...await db.insert(...)... }
  ```
  works as-is in an async function.

- [ ] **Step 14.3:** Run typecheck — lets TS surface any missed await
  ```bash
  npx tsc --noEmit
  ```
  Expected: clean. If errors like "Type 'Promise<...>' is missing property ..." appear, those are the missed `await`s — add them.

- [ ] **Step 14.4:** Run full tests
  ```bash
  npm test
  ```
  Expected: 161/161 pass. If tests that touch the DB fail, re-check the test setup for any sync `.get()` calls in fixtures.

- [ ] **Step 14.5:** Commit
  ```bash
  git add package.json package-lock.json \
          src/lib/db/index.ts drizzle.config.ts \
          src/  # all files touched by step 14.2
  git commit -m "refactor: swap better-sqlite3 for libsql, await all drizzle calls"
  ```

### Task 15: Generate + apply the schema migration against Turso

- [ ] **Step 15.1:** Generate a fresh migration from the current schema
  ```bash
  npx drizzle-kit generate
  ```
  Expected: a new `drizzle/NNNN_*.sql` file describing the full schema.

- [ ] **Step 15.2:** Apply to Turso
  ```bash
  # Verify TURSO_DATABASE_URL + TURSO_AUTH_TOKEN are set in env
  npx drizzle-kit push
  ```
  Expected: schema created in Turso.

- [ ] **Step 15.3:** Commit the migration files
  ```bash
  git add drizzle/
  git commit -m "chore(db): drizzle migration for Turso"
  ```

### Task 16: Migrate existing data (SQLite → Turso)

**Files:**
- Create: `scripts/migrate-sqlite-to-turso.ts`

- [ ] **Step 16.1:** Write the migration script in `scripts/migrate-sqlite-to-turso.ts`:

  ```typescript
  import Database from "better-sqlite3"; // only installed for this one script
  import { createClient } from "@libsql/client";

  const sqlitePath = process.argv[2] || "./data/fakecarrier.db";
  const src = new Database(sqlitePath, { readonly: true });

  const dst = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const tables = [
    "checks",
    "documents",
    "chat_messages",
    "backlog_items",
    "feedback",
  ];

  async function main() {
    for (const table of tables) {
      const rows = src.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
      console.log(`Migrating ${rows.length} row(s) from ${table}`);
      if (rows.length === 0) continue;
      const cols = Object.keys(rows[0]);
      const placeholders = cols.map(() => "?").join(", ");
      const sql = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`;
      const statements = rows.map((r) => ({
        sql,
        args: cols.map((c) => r[c] as string | number | null),
      }));
      await dst.batch(statements, "write");
    }
    console.log("Done.");
  }

  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
  ```

- [ ] **Step 16.2:** Install `better-sqlite3` as a temporary dev dep for this script (we uninstalled it in Task 13)
  ```bash
  npm install --legacy-peer-deps --save-dev better-sqlite3 @types/better-sqlite3 tsx
  ```

- [ ] **Step 16.3:** Run the migration
  ```bash
  npx tsx scripts/migrate-sqlite-to-turso.ts ./data/fakecarrier.db
  ```
  Expected: row counts per table, "Done." at the end.

- [ ] **Step 16.4:** Sanity-check Turso
  ```bash
  turso db shell fakecarrier
  .tables
  SELECT COUNT(*) FROM checks;
  SELECT COUNT(*) FROM backlog_items;
  .quit
  ```
  Expected: counts match your local SQLite.

- [ ] **Step 16.5:** Uninstall the temporary dev deps
  ```bash
  npm uninstall --legacy-peer-deps --save-dev better-sqlite3 @types/better-sqlite3
  # keep tsx — useful for future scripts
  ```

- [ ] **Step 16.6:** Commit
  ```bash
  git add scripts/migrate-sqlite-to-turso.ts package.json package-lock.json
  git commit -m "chore(db): one-shot SQLite-to-Turso row migration script"
  ```

### Task 17: Verify end-to-end against Turso

- [ ] **Step 17.1:** Restart dev server so it picks up the libsql driver
  ```bash
  npm run dev
  ```

- [ ] **Step 17.2:** Repeat the full flow — upload, classify, chat (same as the Azure migration's smoke tests). Confirm all DB reads/writes go to Turso (watch `turso db shell` in another tab).

---

## Phase 5 — Analytics logging

**Goal:** Remove `appendFileSync("logs/analytics.log", ...)`. Serverless runtimes have no persistent FS. Replace with structured `console.log` plus a queryable `analytics_events` DB table.

### Task 18: Add `analytics_events` table + logger

**Files:**
- Modify: `src/lib/db/schema.ts` — add table
- Create: `src/lib/analytics.ts`
- Create: `src/lib/analytics.test.ts`
- Modify: `src/app/api/classify/route.ts` — swap `logAnalytics`

- [ ] **Step 18.1:** Extend `src/lib/db/schema.ts`:

  ```typescript
  export const analyticsEvents = sqliteTable("analytics_events", {
    id: text("id").primaryKey(),
    event: text("event").notNull(),        // e.g. "classify.start", "classify.done"
    checkId: text("check_id"),
    documentId: text("document_id"),
    durationMs: integer("duration_ms"),
    meta: text("meta"),                    // JSON blob as string
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  });

  export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
  ```

- [ ] **Step 18.2:** Create `src/lib/analytics.ts`:

  ```typescript
  import { db } from "@/lib/db";
  import { analyticsEvents } from "@/lib/db/schema";
  import { generateId } from "@/lib/utils";

  export async function logEvent(event: string, data: {
    checkId?: string;
    documentId?: string;
    durationMs?: number;
    meta?: Record<string, unknown>;
  } = {}): Promise<void> {
    console.log(`[analytics] ${event}`, data);
    try {
      await db.insert(analyticsEvents).values({
        id: generateId(),
        event,
        checkId: data.checkId ?? null,
        documentId: data.documentId ?? null,
        durationMs: data.durationMs ?? null,
        meta: data.meta ? JSON.stringify(data.meta) : null,
      }).run();
    } catch (err) {
      // Never let telemetry break a request
      console.warn(`[analytics] DB write failed: ${err}`);
    }
  }
  ```

- [ ] **Step 18.3:** Create `src/lib/analytics.test.ts`:

  ```typescript
  import { describe, it, expect } from "vitest";

  describe("analytics module", () => {
    it("exports logEvent as an async function", async () => {
      const mod = await import("./analytics");
      expect(typeof mod.logEvent).toBe("function");
      // Does not throw when DB is unreachable — telemetry must never break a request
      const p = mod.logEvent("test.smoke", { meta: { ok: true } });
      await expect(p).resolves.toBeUndefined();
    });
  });
  ```

- [ ] **Step 18.4:** Run tests
  ```bash
  npx vitest run src/lib/analytics.test.ts
  ```
  Expected: 1 PASS.

- [ ] **Step 18.5:** Replace the in-file `logAnalytics` helper in `src/app/api/classify/route.ts` with calls to `logEvent`.

  Remove the `appendFileSync`/`mkdirSync`/`existsSync` imports and the `logAnalytics` function.
  Add:
  ```typescript
  import { logEvent } from "@/lib/analytics";
  ```
  Replace every `logAnalytics("START classify | ...")` with an equivalent `await logEvent("classify.start", { checkId, documentId, meta: {...} })` call. Example:

  Before:
  ```typescript
  logAnalytics(`START classify | file=${doc.fileName} | docId=${documentId}`);
  ```
  After:
  ```typescript
  await logEvent("classify.start", {
    documentId,
    meta: { fileName: doc.fileName },
  });
  ```

- [ ] **Step 18.6:** Regenerate + apply the DB migration for the new table
  ```bash
  npx drizzle-kit generate
  npx drizzle-kit push
  ```

- [ ] **Step 18.7:** Typecheck + tests
  ```bash
  npx tsc --noEmit && npm test
  ```
  Expected: all green.

- [ ] **Step 18.8:** Commit
  ```bash
  git add src/lib/db/schema.ts src/lib/analytics.ts src/lib/analytics.test.ts \
          src/app/api/classify/route.ts drizzle/
  git commit -m "feat(analytics): replace logs/analytics.log with console + analytics_events table"
  ```

- [ ] **Step 18.9:** Delete `logs/` directory and its `.gitkeep` if present — it's no longer used
  ```bash
  rm -rf logs/
  ```

---

## Phase 6 — Deploy to Vercel

**Goal:** Preview URL works end-to-end with Turso + Blob + Azure OpenAI. Promote to production after smoke testing.

### Task 19: Install Vercel CLI + link project

- [ ] **Step 19.1:** Install and log in
  ```bash
  npm install -g vercel
  vercel login
  ```

- [ ] **Step 19.2:** Link the project from within the worktree
  ```bash
  vercel link
  # Scope: your team
  # Link to existing project? No — create new
  # Project name: fakecarrier
  # Directory: ./  (current)
  ```

### Task 20: Configure env vars in Vercel

Vercel dashboard → Project → Settings → Environment Variables. For **Preview** and **Production**, add:

- [ ] **Step 20.1:** Add each variable (values from `.env.local`):
  - `AZURE_OPENAI_ENDPOINT`
  - `AZURE_OPENAI_API_KEY`
  - `AZURE_OPENAI_API_VERSION`
  - `AZURE_OPENAI_DEPLOYMENT_CHAT`
  - `AZURE_OPENAI_DEPLOYMENT_ANALYSIS`
  - `TURSO_DATABASE_URL`
  - `TURSO_AUTH_TOKEN`
  - `BLOB_READ_WRITE_TOKEN` (Vercel will auto-populate this if the Blob store is linked to the project)
  - `STORAGE_DRIVER=blob`

  Do **not** set `DATABASE_URL` (removed from usage; Turso handles it).

### Task 21: Function timeouts

Classify + analyze can take 30s+. Default hobby timeout is 10s. Set per-route `maxDuration` to cover worst case.

**Files:**
- Modify: `src/app/api/classify/route.ts`
- Modify: `src/app/api/analyze/route.ts`

- [ ] **Step 21.1:** At the top of each file (below imports), export:
  ```typescript
  export const maxDuration = 180; // seconds, must not exceed plan limit
  ```

- [ ] **Step 21.2:** Add to `src/app/api/chat/route.ts` as well:
  ```typescript
  export const maxDuration = 120;
  ```

- [ ] **Step 21.3:** Commit
  ```bash
  git add src/app/api/classify/route.ts src/app/api/analyze/route.ts src/app/api/chat/route.ts
  git commit -m "chore: set maxDuration for long-running route handlers (Vercel functions)"
  ```

### Task 22: First preview deploy

- [ ] **Step 22.1:** Push the branch
  ```bash
  git push -u origin feat/vercel-deploy
  ```
  Expected: Vercel automatically builds a preview for this branch.

- [ ] **Step 22.2:** Open the preview URL from the Vercel dashboard.
  Expected: the app loads. The checks in Verlauf are the ones migrated from your local SQLite. The backlog items show BL-001 through BL-039 (including BL-015 "Vercel + Turso deployment" — which this PR is delivering).

- [ ] **Step 22.3:** Smoke-test on the preview:
  1. Upload `Samples/Versicherungsbestatigung-verkehrshaftung-2025.pdf` under carrier "Sand-Körner GmbH"
  2. Classification should run and show `insurance-cert` with extracted fields
  3. Step 3 "full analysis" should complete (watch the Vercel logs for any timeout)
  4. The chat panel on the results page should stream in German

- [ ] **Step 22.4:** Any issues:
  - **Timeout on `/api/analyze`** → increase `maxDuration` on that route (cap: 300 on Pro plan)
  - **Blob 403 / unauthorized** → verify `BLOB_READ_WRITE_TOKEN` is set for Preview env
  - **Turso errors** → verify `TURSO_DATABASE_URL` starts with `libsql://` and the auth token hasn't expired
  - **PDF parse failures** → `pdf-parse` occasionally chokes on weird PDFs; test locally with the same file

### Task 23: Promote to production

- [ ] **Step 23.1:** Merge `feat/vercel-deploy` to `main`
  ```bash
  git checkout main
  git merge --no-ff feat/vercel-deploy
  git push origin main
  ```
  Expected: Vercel promotes the build to the production URL.

- [ ] **Step 23.2:** Re-run the smoke test against the production URL.

- [ ] **Step 23.3:** Clean up the worktree
  ```bash
  cd ~/FakeCarrier
  git worktree remove .worktrees/vercel-deploy
  git branch -d feat/vercel-deploy  # optional; keep if you want history
  ```

---

## Followup backlog items to file during execution

Expect these to emerge — file them as you go:

- **BL-040:** Reinstate PDF rasterization via external renderer (separate service with poppler), so visual-only risk signals fire on small PDFs again. Context: dropped on Vercel for serverless compatibility.
- **BL-041:** Rotate Azure OpenAI API key + move secret to Vercel OIDC / Entra ID federation (the current key lives in a shared Foundry resource).
- **BL-042:** Custom domain + HTTPS redirects for the production Vercel URL.
- **BL-043:** Preview-branch Turso isolation (separate DB or shared read-only replica) so preview deploys don't write to production data.

---

## Self-review checklist (done before saving this plan)

- **Spec coverage:** Every item in the original spec (DB migration, file storage, PDF tooling, analytics logging, env vars) has at least one task. ✓
- **Placeholder scan:** No "TBD", no "implement later". Infrastructure steps (Task 9 Blob provisioning, Task 12 Turso creation, Task 19 Vercel link, Task 20 env vars) use the dashboard — this is unavoidable and documented with specific field names. ✓
- **Type consistency:** `Storage.get(key)` returns `Promise<Buffer>` everywhere. `extractPdfText` takes `Buffer` after Task 7. Route handlers become `async` where `await db...` was added. ✓
- **One-way vs reversible:** Phases 1–5 leave the app runnable locally (with `STORAGE_DRIVER=local` and `TURSO_DATABASE_URL=file:./data/fakecarrier.db`). Only Phase 6 introduces new infra (Turso + Blob + Vercel project). ✓

---

## Execution

Once this plan is reviewed and you agree, execute it via the sub-skill noted in the header. Between phases is a natural pause point — you can stop after any phase, commit + merge, and resume later.
