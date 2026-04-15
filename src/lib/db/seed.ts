import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { backlogItems } from "./schema";
import { generateId, formatBacklogNumber } from "../utils";
import { existsSync, mkdirSync } from "fs";
import path from "path";

const SEED_ITEMS = [
  { title: "External registry API: VIES (EU VAT validation)", priority: "high" as const, description: "Integrate VIES API to auto-validate VAT numbers. Provider pattern already in place." },
  { title: "External registry API: KREPTD (PL transport license)", priority: "high" as const, description: "Query Polish transport license register for license validity and vehicle count." },
  { title: "External registry API: BALM (DE transport register)", priority: "high" as const, description: "Query German BALM Verkehrsunternehmerdatei for German-based carriers." },
  { title: "External registry APIs: KRS, CEIDG, ONRC, ARR, RPSD", priority: "high" as const, description: "Remaining country-specific registries (PL, RO, CZ) from Datenquellen_Uebersicht." },
  { title: "User feedback collection process", priority: "high" as const, description: "In-app feedback mechanism for MVP testers — see spec Section 18." },
  { title: "Rebrand to SCHUNCK Group", priority: "medium" as const, description: "Swap Ecclesia brand tokens and logo for SCHUNCK Group identity. Brand is centralized in Tailwind theme — token swap only." },
  { title: "MS Entra Azure authentication", priority: "medium" as const, description: "Add SSO login for broker and client access. Required before client rollout." },
  { title: "Multi-tenant client access & billing", priority: "medium" as const, description: "Role-based access (broker vs. client), per-check billing (2-5 EUR), PayPal/digital payment." },
  { title: "TIMOCOM API integration", priority: "medium" as const, description: "Auto-pull carrier profile from TIMOCOM instead of manual upload." },
  { title: "Blacklist database integration", priority: "medium" as const, description: "Connect to TAPA, IConsult47, and other fraud databases for known-bad carrier matching." },
  { title: "Vercel + Turso deployment", priority: "medium" as const, description: "Migrate from local SQLite to Vercel hosting with Turso database." },
  { title: "Azure data persistence", priority: "low" as const, description: "Alternative to Turso: Azure-based file and data storage." },
  { title: "Fahrzeug-Fotoanalyse (vehicle photo analysis)", priority: "low" as const, description: "Use Claude vision to analyze vehicle photos for plausibility." },
  { title: "Graph-based pattern analysis", priority: "low" as const, description: "Cross-check carriers against a relationship graph of known entities." },
  { title: "Agent-to-Agent cooperation", priority: "low" as const, description: "Compliance agent, legal agent, etc. working together on complex cases." },
];

async function seed() {
  const dbDir = path.join(process.cwd(), "data");
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, "fakecarrier.db");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });

  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS checks (
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS documents (
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
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      check_id TEXT NOT NULL REFERENCES checks(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS backlog_items (
      id TEXT PRIMARY KEY,
      item_number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'backlog',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      check_id TEXT REFERENCES checks(id),
      category TEXT NOT NULL,
      comment TEXT NOT NULL,
      page TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Check if backlog already seeded
  const existing = db.select().from(backlogItems).all();
  if (existing.length > 0) {
    console.log("Backlog already seeded, skipping.");
    return;
  }

  const now = new Date().toISOString();
  for (let i = 0; i < SEED_ITEMS.length; i++) {
    const item = SEED_ITEMS[i];
    db.insert(backlogItems).values({
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

seed();
