# OSINT forensic metadata checks — Slice A design

**Date:** 2026-04-18
**Scope:** Metadata-only forensic analysis for uploaded images and PDFs. Deterministic, fast, no ML. First slice of the OSINT manipulation-detection workstream; Slice C (full depth: ELA, C2PA, signature validation) follows later.

## Goal

Extract forensic metadata from every uploaded image and PDF and flag risk signals that indicate tampering or untrusted provenance. Findings flow into the existing risk-score pipeline and surface in the results UI.

## Non-goals (Slice A)

- Error Level Analysis (ELA) — Slice C
- C2PA provenance manifest verification — Slice C
- Digital signature cryptographic validation — Slice C
- Thumbnail/visible-image mismatch detection — Slice C
- Deepfake / AI-generated detection — separate backlog item, external API
- Admin-configurable weights — separate backlog item (migration task already in BL)

## Architecture

Two new modules alongside existing provider code:

- `src/lib/analysis/providers/forensic-image.ts`
- `src/lib/analysis/providers/forensic-pdf.ts`

Each module exports:

1. A **pure rule function** (`evaluateImageMetadata(meta)` / `evaluatePdfMetadata(info, prevCount, hasJS)`) that takes a plain metadata object and returns `RiskSignal[]`. Trivially unit-testable, no I/O.
2. An **analyze function** that takes a `Buffer` and returns `{ metadata, riskSignals }`. Calls the library (exifr / pdf-parse), then the rule function. Thin integration layer.

Weights live in `src/lib/analysis/forensic-weights.ts` as named constants, grouped by type (`IMAGE`, `PDF`).

## Pipeline integration

In `src/lib/analysis/pipeline.ts`, for each uploaded document:

1. The existing Claude analysis runs as today.
2. In parallel, the appropriate forensic analyzer runs on the same buffer (image analyzer for image MIME types, PDF analyzer for `application/pdf`).
3. Results are merged into the existing `ProviderResult`:
   - `extraction.riskSignals` → concatenated with forensic signals
   - `extraction.fields.forensicMetadata` → populated with the extracted metadata object

No changes to `scoring.ts`: the scorer already sums `signal.points` per document. Forensic signals inherit the same severity → score mapping because each signal carries its own `points` from the weights file.

## Rules (Slice A)

### Images (`evaluateImageMetadata`)

| Signal | Severity | Points | Trigger |
|---|---|---|---|
| `image-editing-software` | major | 30 | EXIF `Software` tag contains Photoshop / Lightroom / GIMP / Pixelmator / Affinity / Paint.NET |
| `image-no-metadata` | minor | 15 | No EXIF block found |
| `image-date-inconsistency` | minor | 10 | `DateTimeOriginal` and `ModifyDate` differ by more than 24h |

### PDFs (`evaluatePdfMetadata`)

| Signal | Severity | Points | Trigger |
|---|---|---|---|
| `pdf-online-editor` | major | 30 | `/Producer` or `/Creator` matches iLovePDF / Smallpdf / Sejda / PDFescape / Soda PDF / online2pdf |
| `pdf-incremental-updates` | major | 25 | `prevCount > 0` (document was edited after first save) |
| `pdf-embedded-javascript` | critical | 45 | buffer contains `/JS` or `/OpenAction` reference |
| `pdf-no-metadata` | minor | 15 | info object is empty or missing Producer/Creator/Author/Title |
| `pdf-date-inconsistency` | minor | 10 | `ModDate < CreationDate` or they differ by more than 5 years |

Signal rule IDs follow the existing naming pattern from `src/lib/config/document-types.ts`.

## Packages

- **Add**: `exifr` — pure JS, Vercel serverless compatible, reads Buffer
- **Reuse**: `pdf-parse` (already in deps) for `.info` metadata; regex on raw buffer for `/Prev` count and `/JS`/`/OpenAction` detection. No new PDF dep.

## UI

Each document result card on the existing results page gains a **"Forensische Prüfung"** section rendering:

- Metadata key/value list (Producer, Creator, CreationDate, ModDate for PDFs; Make, Model, Software, DateTimeOriginal, GPS presence for images). Grey "Keine Metadaten gefunden" if empty.
- Forensic risk signals rendered using the existing severity-badge styling used elsewhere on the results page.

No new components. No i18n keys required (strings kept inline, German, per project convention).

## Tests (TDD order)

1. `forensic-weights.test.ts` — verify shape + point values (smoke test)
2. `forensic-image.test.ts` — `evaluateImageMetadata` cases: Photoshop fingerprint, clean consumer-camera EXIF, empty metadata, date mismatch. Then one thin-integration test: real small JPEG buffer → metadata roundtrip via exifr.
3. `forensic-pdf.test.ts` — `evaluatePdfMetadata` cases: iLovePDF producer, incremental updates, embedded JS, clean PDF, empty info. Then one thin-integration test: real small PDF buffer → metadata + prevCount + hasJS via pdf-parse + regex.
4. Integration test in `pipeline.test.ts` (if such exists) is out of scope for Slice A; covered manually via dev server.

## Risks / open questions

- `exifr` bundle size on Vercel: package claims ~4 KiB gzipped when tree-shaken. Acceptable.
- `pdf-parse` in Vercel: already in use for existing flows, known good.
- False positives on legitimate Photoshop-edited marketing photos: acceptable for Slice A; the signal is `major` not `critical` and the broker makes the final call. Will revisit when admin weights ship.
