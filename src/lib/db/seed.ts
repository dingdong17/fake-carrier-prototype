import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { backlogItems } from "./schema";
import { generateId, formatBacklogNumber } from "../utils";

const SEED_ITEMS = [
  { title: "External registry API: VIES (EU VAT validation)", priority: "high" as const, description: "Integrate VIES API to auto-validate VAT numbers. Provider pattern already in place." },
  { title: "External registry API: KREPTD (PL transport license)", priority: "high" as const, description: "Query Polish transport license register for license validity and vehicle count." },
  { title: "External registry API: BALM (DE transport register)", priority: "high" as const, description: "Query German BALM Verkehrsunternehmerdatei for German-based carriers." },
  { title: "External registry APIs: KRS, CEIDG, ONRC, ARR, RPSD", priority: "high" as const, description: "Remaining country-specific registries (PL, RO, CZ) from Datenquellen_Uebersicht." },
  { title: "User feedback collection process", priority: "high" as const, description: "In-app feedback mechanism for MVP testers — see spec Section 18." },
  { title: "Admin-configurable bonus/malus scoring rules", priority: "high" as const, description: "Admin-only settings page to configure positive and negative score impacts per check signal for risk and trust. One row per check with bonus/malus columns (examples: +60 signed PDF, 0 unsigned PDF, -30 PDF without metadata, -150 manipulated image). Replaces hardcoded weights in prompts/config so scoring can be tuned without code changes. Requires auth + role gating (see MS Entra backlog item) and a scoring-rules table." },
  { title: "Migrate forensic image/PDF weights to admin bonus/malus page", priority: "medium" as const, description: "Forensic OSINT checks (image EXIF + manipulation, PDF metadata + manipulation) initially ship with hardcoded weights in a `forensic-weights.ts` constants file. When the admin bonus/malus page (BL-above) is built, migrate these weights into the scoring-rules table so they become tunable per-tenant. Blocked by the admin scoring-rules work." },
  { title: "Rebrand to SCHUNCK Group", priority: "medium" as const, description: "Swap Ecclesia brand tokens and logo for SCHUNCK Group identity. Brand is centralized in Tailwind theme — token swap only." },
  { title: "MS Entra Azure authentication", priority: "medium" as const, description: "Add SSO login for broker and client access. Required before client rollout." },
  { title: "Multi-tenant client access & billing", priority: "medium" as const, description: "Role-based access (broker vs. client), per-check billing (2-5 EUR), PayPal/digital payment." },
  { title: "TIMOCOM API integration", priority: "medium" as const, description: "Auto-pull carrier profile from TIMOCOM instead of manual upload." },
  { title: "Blacklist database integration", priority: "medium" as const, description: "Connect to TAPA, IConsult47, and other fraud databases for known-bad carrier matching." },
  { title: "OSINT image check: EXIF + manipulation analysis", priority: "medium" as const, description: "Extract EXIF (camera, GPS, date, editing-software fingerprint) and flag manipulation for every uploaded image; surface findings in the results view. Vercel-compatible stack: `exifr` (pure-JS metadata), `sharp` (ELA via recompression-diff, already on Vercel runtime), `c2pa-node` for C2PA provenance. External options for deepfake / AI-generated detection: Sensity API, Hive AI, TruePic." },
  { title: "OSINT PDF check: metadata + manipulation analysis", priority: "medium" as const, description: "Extract PDF metadata (Creator, Producer, CreationDate, ModDate, XMP) and detect manipulation signals: incremental updates (/Prev in xref), multiple revisions, embedded JavaScript / launch actions, digital-signature validity, known-editor fingerprints (Photoshop, iText, ghostscript, online PDF-editor tools); surface findings in the results view. Vercel-compatible stack: `pdfjs-dist` + `pdf-lib` (pure JS). Optional external: VirusTotal API for malicious-PDF scan." },
  { title: "Vercel + Turso deployment", priority: "medium" as const, description: "Migrate from local SQLite to Vercel hosting with Turso database." },
  { title: "Azure data persistence", priority: "low" as const, description: "Alternative to Turso: Azure-based file and data storage." },
  { title: "Fahrzeug-Fotoanalyse (vehicle photo analysis)", priority: "low" as const, description: "Use Claude vision to analyze vehicle photos for plausibility." },
  { title: "Graph-based pattern analysis", priority: "low" as const, description: "Cross-check carriers against a relationship graph of known entities." },
  { title: "Agent-to-Agent cooperation", priority: "low" as const, description: "Compliance agent, legal agent, etc. working together on complex cases." },
  { title: "Surface real error messages instead of generic \"Klassifizierung fehlgeschlagen\"", priority: "medium" as const, description: "Upload flow currently shows a generic \"Klassifizierung fehlgeschlagen\" for every 500 from /api/classify, hiding the real cause (e.g. missing ANTHROPIC_API_KEY, network timeout, malformed file, Claude API rate limit). Forward the server-side error message (or a classified error code) to the UI so testers and broker users can report actionable feedback. Guard against leaking sensitive details (API keys, internal paths) when forwarding." },
  { title: "Remove orphaned pipeline.ts or refactor routes to use it", priority: "medium" as const, description: "src/lib/analysis/pipeline.ts duplicates analysis logic inline in /api/analyze/route.ts and /api/classify/route.ts but has zero callers. This caused a real bug: forensic hook was added to pipeline.ts but didn't show up in the UI because the live routes have their own copy. Decide: delete pipeline.ts (simplest) or refactor both routes to call runAnalysisPipeline (DRY but bigger). Either way, eliminate the duplication." },
  { title: "Log forensic extraction errors instead of swallowing them", priority: "low" as const, description: "analyzePdf and analyzeImage currently catch all errors silently and return empty metadata. This makes a real no-metadata PDF indistinguishable from a pdf-parse throw — caused a 30-minute debug when the Next.js bundler broke pdfjs-dist. Log the sanitized error to logs/analytics.log with a FORENSIC_ERROR prefix so future bundler or runtime breakage surfaces immediately. Preserve the best-effort behavior so the pipeline still completes." },
  { title: "Sanctions-list screening (OFAC, EU, UK)", priority: "high" as const, description: "Screen carrier company name, VAT ID, and beneficial owners against OFAC SDN, EU consolidated sanctions list, and UK HM Treasury list. Block or hard-flag matches. Use OpenSanctions API (covers all three) or direct official feeds. Legal/compliance requirement for DE/EU brokers — do not do business with sanctioned entities." },
  { title: "Beneficial-ownership / UBO check", priority: "medium" as const, description: "Resolve ultimate beneficial owners via DE Transparenzregister, PL CRBR, RO ONPCSB. Flag when: carrier has no UBO filed (required by law in EU), UBO is on a sanctions list, UBO appears across multiple phantom-carrier names (entity graph). Pair with sanctions screening above." },
  { title: "Phone number verification (reverse lookup + geo consistency)", priority: "medium" as const, description: "Verify claimed landline: (a) does the number exist / is it reachable (HLR lookup via Twilio or similar); (b) reverse lookup maps back to the claimed company name (DasTelefonbuch DE, PanoramaFirm PL, Truecaller); (c) area code is geographically consistent with the registered office address. Mobile-only or foreign-prefix landlines on a DE/AT company are a known phantom-carrier pattern." },
  { title: "Address / office location verification", priority: "medium" as const, description: "Verify the registered business address is an actual commercial premise, not a residential flat, a virtual-office mailbox, or a non-existent location. Use Google Maps/Places API (business type, photos) and/or OpenStreetMap + land-registry data. Cross-check with satellite imagery for 'trucks parked here' plausibility on claimed fleet-depot addresses." },
  { title: "Domain / website forensics (Whois age, SSL, reputation)", priority: "medium" as const, description: "Extend existing domain-check provider with: Whois creation date (domains <90 days are a red flag), registrar reputation (some registrars are bulletproof-hosting favorites), nameserver changes, SSL certificate issuer + validity + whether the cert CN matches the claimed company, HSTS/security-header posture. Website reachability alone is too weak a signal." },
  { title: "Social / professional presence sanity check", priority: "low" as const, description: "Check LinkedIn company page existence, age, and employee count vs. claimed fleet size (company claiming 50 trucks with 0 LinkedIn employees is suspicious). Similar weak signals: Google Business profile age, number of reviews, last-activity date. Probabilistic signal, useful only in aggregate — do not weight heavily." },
  { title: "Prior-fraud community-forum lookup", priority: "low" as const, description: "Check carrier name/VAT against known phantom-carrier lists posted on TruckerForum, trans.info, SCHUNCK webinar references, and similar industry sources. Scraping-heavy and legally grey (ToS of each forum must be checked). Start with a curated internal watchlist populated from the SCHUNCK webinar PDF and grow from there." },
  { title: "Check catalog: user-facing page explaining all checks + score impact", priority: "medium" as const, description: "New route (e.g. /checks-catalog) and matching nav link. Lists every check the product runs — document extraction, VIES, forensic-image, forensic-pdf, domain, email, website, KREPTD, BALM, sanctions, UBO, address, phone, etc. — grouped by category. Each entry: 1-2 paragraph plain-language description (German), data source (VIES, exifr, OpenSanctions…), and a Score Impact block with three rows: Passed (often 0 or a bonus), Failed (point delta added to risk), Skipped (0 + confidence reduction). Reads from a single constants file src/lib/catalog/checks.ts so the same data also powers inline (?)-tooltips next to risk signals on the results page. When BL-006 (admin bonus/malus) ships, this constants file is the migration source." },
  { title: "Start-page test-set picker (Quick / Medium / Full)", priority: "medium" as const, description: "On the check-start page, before file upload, user picks a test depth: Quick (5-7 cheap/fast checks — VAT format, VIES, document classification, domain/email sanity, file forensic metadata), Medium (Quick + OSINT PDF/image deep, sanctions, domain forensics, address verification — ~15 checks, ~30s), Full (Medium + AI vision extraction, cross-document consistency, vehicle-photo plausibility, forum-lookup — all checks, may take 1-2 min). Selection drives which providers run in /api/analyze and /api/verify. Persist user choice per check for audit. Default to Medium. UI: three radio-cards with the list of checks each tier runs so the broker understands the tradeoff." },
];

async function seed() {
  const client = createClient({ url: "file:./data/fakecarrier.db" });
  const db = drizzle(client, { schema });

  const createStatements = [
    `CREATE TABLE IF NOT EXISTS checks (
      id TEXT PRIMARY KEY,
      check_number TEXT NOT NULL UNIQUE,
      carrier_name TEXT NOT NULL,
      carrier_country TEXT,
      carrier_vat_id TEXT,
      carrier_contact TEXT,
      risk_score REAL,
      confidence_level REAL,
      recommendation TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      test_set TEXT NOT NULL DEFAULT 'medium',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      check_id TEXT NOT NULL REFERENCES checks(id),
      document_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      extracted_fields TEXT,
      risk_signals TEXT,
      document_score REAL,
      confidence REAL,
      status TEXT NOT NULL DEFAULT 'uploaded',
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      check_id TEXT NOT NULL REFERENCES checks(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS backlog_items (
      id TEXT PRIMARY KEY,
      item_number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'backlog',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      check_id TEXT REFERENCES checks(id),
      category TEXT NOT NULL,
      comment TEXT NOT NULL,
      page TEXT,
      created_at TEXT NOT NULL
    )`,
  ];

  for (const stmt of createStatements) {
    await client.execute(stmt);
  }

  const existing = await db.select().from(backlogItems).all();
  if (existing.length > 0) {
    console.log("Backlog already seeded, skipping.");
    return;
  }

  const now = new Date().toISOString();
  for (let i = 0; i < SEED_ITEMS.length; i++) {
    const item = SEED_ITEMS[i];
    await db.insert(backlogItems).values({
      id: generateId(),
      itemNumber: formatBacklogNumber(i + 1),
      title: item.title,
      description: item.description,
      priority: item.priority,
      status: "backlog",
      sortOrder: i,
      createdAt: now,
      updatedAt: now,
    }).run();
  }

  console.log(`Seeded ${SEED_ITEMS.length} backlog items.`);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
