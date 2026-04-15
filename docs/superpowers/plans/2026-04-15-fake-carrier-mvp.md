# FakeCarrier Check MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an AI-powered phantom carrier verification web app that analyzes uploaded documents via Claude, produces a two-axis risk/confidence score, and generates branded PDF audit reports.

**Architecture:** Monolithic Next.js 15 App Router application. Claude API for document analysis via a provider-pattern pipeline. Drizzle ORM with SQLite for persistence. Ecclesia Gruppe brand via Tailwind CSS custom theme.

**Tech Stack:** Next.js 15 (App Router), TypeScript, React, Tailwind CSS, Drizzle ORM, SQLite (better-sqlite3), Anthropic SDK, @react-pdf/renderer

**Spec:** `docs/superpowers/specs/2026-04-15-fake-carrier-check-mvp-design.md`

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                    Root layout with nav, Ecclesia brand
│   ├── page.tsx                      Home page
│   ├── check/
│   │   └── page.tsx                  Check wizard (upload + analysis)
│   ├── results/
│   │   └── [id]/
│   │       └── page.tsx              Results dashboard
│   ├── history/
│   │   └── page.tsx                  Check history list
│   ├── backlog/
│   │   └── page.tsx                  Kanban board
│   ├── feedback/
│   │   └── page.tsx                  Feedback review list
│   ├── api/
│   │   ├── upload/
│   │   │   └── route.ts              File upload handler
│   │   ├── analyze/
│   │   │   └── route.ts              Analysis orchestration (streaming)
│   │   ├── chat/
│   │   │   └── route.ts              Chat follow-up (streaming)
│   │   ├── report/
│   │   │   └── [id]/
│   │   │       └── route.ts          PDF generation
│   │   ├── checks/
│   │   │   └── route.ts              CRUD for checks
│   │   ├── backlog/
│   │   │   └── route.ts              CRUD for backlog items
│   │   └── feedback/
│   │       └── route.ts              CRUD for feedback
│   └── globals.css                   Tailwind + Ecclesia tokens
├── components/
│   ├── layout/
│   │   ├── header.tsx                Top nav with Ecclesia logo
│   │   ├── nav-links.tsx             Navigation links
│   │   └── footer.tsx                Footer with disclaimer
│   ├── check/
│   │   ├── progress-bar.tsx          4-step progress indicator
│   │   ├── file-dropzone.tsx         Drag-and-drop upload area
│   │   ├── carrier-form.tsx          Carrier info fields
│   │   ├── document-list.tsx         Uploaded files with type badges
│   │   └── analysis-stream.tsx       Live analysis results
│   ├── results/
│   │   ├── risk-confidence-chart.tsx Gradient diagonal SVG chart
│   │   ├── recommendation-banner.tsx Color-coded recommendation
│   │   ├── document-card.tsx         Expandable document analysis
│   │   ├── missing-docs.tsx          Missing document impact
│   │   ├── next-steps.tsx            Human action items
│   │   ├── guidance-tier.tsx         Three-tier AI/Human/Outside labels
│   │   └── chat-panel.tsx            Side panel chat UI
│   ├── backlog/
│   │   ├── kanban-board.tsx          Drag-and-drop kanban
│   │   ├── kanban-column.tsx         Single column
│   │   ├── kanban-card.tsx           Card with priority badge
│   │   └── add-item-form.tsx         Quick-add form
│   ├── feedback/
│   │   ├── feedback-prompt.tsx       Post-check feedback widget
│   │   └── feedback-form.tsx         Full feedback form
│   └── ui/
│       ├── badge.tsx                 Priority/severity badges
│       ├── button.tsx                Ecclesia-styled button
│       ├── card.tsx                  Card container
│       └── input.tsx                 Form input
├── lib/
│   ├── db/
│   │   ├── index.ts                  Drizzle client setup
│   │   ├── schema.ts                 All table definitions
│   │   └── seed.ts                   Backlog seed data (BL-001 to BL-015)
│   ├── analysis/
│   │   ├── pipeline.ts               Orchestrator
│   │   ├── providers/
│   │   │   ├── types.ts              Provider interface
│   │   │   └── claude-document.ts    Claude document analysis provider
│   │   ├── scoring.ts                Risk + confidence calculation
│   │   └── prompts/
│   │       ├── system.ts             Base system prompt
│   │       ├── classify.ts           Document classification prompt
│   │       ├── insurance-cert.ts     Insurance cert analysis
│   │       ├── transport-license.ts  Transport license analysis
│   │       ├── letterhead.ts         Letterhead analysis
│   │       ├── freight-profile.ts    Freight profile analysis
│   │       ├── communication.ts      Communication analysis
│   │       ├── driver-vehicle.ts     Driver/vehicle analysis
│   │       ├── cross-check.ts        Cross-document consistency
│   │       └── chat.ts               Chat context prompt
│   ├── config/
│   │   └── document-types.ts         Configurable document type registry
│   ├── pdf/
│   │   ├── report.tsx                PDF report React components
│   │   └── generate.ts              PDF generation function
│   └── utils.ts                      Shared helpers (ID generation, formatting)
├── public/
│   ├── ecclesia-logo.svg             Ecclesia logo (color)
│   └── ecclesia-logo-white.svg       Ecclesia logo (white)
drizzle.config.ts                     Drizzle config
tailwind.config.ts                    Tailwind with Ecclesia tokens
next.config.ts                        Next.js config
package.json
tsconfig.json
.env.local                            ANTHROPIC_API_KEY
uploads/                              Local file storage (gitignored)
```

---

### Task 1: Project Scaffolding & Dependencies

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `drizzle.config.ts`, `.env.local`, `.gitignore`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`

- [ ] **Step 1: Create Next.js project**

```bash
cd /Users/don/FakeCarrier
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select defaults when prompted. If the directory is not empty, it will ask — confirm to proceed.

- [ ] **Step 2: Install dependencies**

```bash
npm install drizzle-orm better-sqlite3 @anthropic-ai/sdk @react-pdf/renderer uuid
npm install -D drizzle-kit @types/better-sqlite3 @types/uuid
```

- [ ] **Step 3: Create environment file**

Create `.env.local`:

```env
ANTHROPIC_API_KEY=your-key-here
DATABASE_URL=file:./data/fakecarrier.db
```

- [ ] **Step 4: Update `.gitignore`**

Append to `.gitignore`:

```
# Local uploads
uploads/

# SQLite database
data/

# Superpowers brainstorm sessions
.superpowers/
```

- [ ] **Step 5: Configure Tailwind with Ecclesia design tokens**

Replace `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ec: {
          "dark-blue": "#2649A5",
          "light-blue": "#0050D2",
          mint: "#75E7BC",
          red: "#F75880",
          turquoise: "#7BD7DB",
          violet: "#AC78E0",
          yellow: "#FFCF31",
          "dark-green": "#005E47",
          "light-green": "#7BCA65",
          black: "#000000",
          "grey-80": "#3B3B3B",
          "grey-70": "#979797",
          "grey-60": "#CCCCCC",
          "grey-40": "#EEEEEE",
          "light-grey": "#F7F7F7",
          "medium-grey": "#E2E2E2",
          surface: "#FFFFFF",
          error: "#E02E2A",
          warning: "#EF6C00",
          info: "#0088D1",
          success: "#2F7D31",
        },
      },
      fontFamily: {
        barlow: ["Barlow", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      maxWidth: {
        content: "1304px",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 6: Set up globals.css with Ecclesia fonts**

Replace `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-ec-dark-blue: #2649A5;
  --color-ec-light-blue: #0050D2;
  --color-ec-mint: #75E7BC;
  --color-ec-red: #F75880;
  --color-ec-turquoise: #7BD7DB;
  --color-ec-violet: #AC78E0;
  --color-ec-yellow: #FFCF31;
  --color-ec-dark-green: #005E47;
  --color-ec-light-green: #7BCA65;
  --color-ec-grey-80: #3B3B3B;
  --color-ec-grey-70: #979797;
  --color-ec-grey-60: #CCCCCC;
  --color-ec-grey-40: #EEEEEE;
  --color-ec-light-grey: #F7F7F7;
  --color-ec-medium-grey: #E2E2E2;
  --color-ec-error: #E02E2A;
  --color-ec-warning: #EF6C00;
  --color-ec-info: #0088D1;
  --color-ec-success: #2F7D31;

  --font-barlow: "Barlow", sans-serif;
  --font-inter: "Inter", sans-serif;
}

@layer base {
  body {
    font-family: var(--font-inter);
    color: var(--color-ec-grey-80);
    background-color: var(--color-ec-light-grey);
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-barlow);
    color: var(--color-ec-dark-blue);
  }
}
```

- [ ] **Step 7: Configure Drizzle**

Create `drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/fakecarrier.db",
  },
});
```

- [ ] **Step 8: Create placeholder root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frachtführer-Prüfung | Ecclesia Gruppe",
  description: "KI-gestützte Prüfung von Frachtführern zur Betrugsprävention",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Inter:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-ec-light-grey font-inter">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Create placeholder home page**

Replace `src/app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="font-barlow text-4xl font-semibold text-ec-dark-blue">
        Frachtführer-Prüfung
      </h1>
    </main>
  );
}
```

- [ ] **Step 10: Verify it runs**

```bash
npm run dev
```

Expected: Dev server starts at http://localhost:3000, shows "Frachtführer-Prüfung" heading in Barlow font with Ecclesia dark blue color.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Ecclesia brand tokens and Drizzle config"
```

---

### Task 2: Database Schema & Seed Data

**Files:**
- Create: `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `src/lib/db/seed.ts`, `src/lib/utils.ts`

- [ ] **Step 1: Create shared utilities**

Create `src/lib/utils.ts`:

```typescript
import { v4 as uuidv4 } from "uuid";

export function generateId(): string {
  return uuidv4();
}

export function formatCheckNumber(seq: number): string {
  return `FC-${String(seq).padStart(3, "0")}`;
}

export function formatBacklogNumber(seq: number): string {
  return `BL-${String(seq).padStart(3, "0")}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
```

- [ ] **Step 2: Create database schema**

Create `src/lib/db/schema.ts`:

```typescript
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const checks = sqliteTable("checks", {
  id: text("id").primaryKey(),
  checkNumber: text("check_number").notNull().unique(),
  carrierName: text("carrier_name").notNull(),
  carrierCountry: text("carrier_country"),
  carrierVatId: text("carrier_vat_id"),
  carrierContact: text("carrier_contact", { mode: "json" }),
  riskScore: real("risk_score"),
  confidenceLevel: real("confidence_level"),
  recommendation: text("recommendation", {
    enum: ["approve", "review", "warning", "reject"],
  }),
  status: text("status", {
    enum: ["draft", "analyzing", "follow_up", "completed"],
  })
    .notNull()
    .default("draft"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  checkId: text("check_id")
    .notNull()
    .references(() => checks.id),
  documentType: text("document_type").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type").notNull(),
  extractedFields: text("extracted_fields", { mode: "json" }),
  riskSignals: text("risk_signals", { mode: "json" }),
  documentScore: real("document_score"),
  confidence: real("confidence"),
  status: text("status", {
    enum: ["uploaded", "analyzing", "analyzed", "error"],
  })
    .notNull()
    .default("uploaded"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  checkId: text("check_id")
    .notNull()
    .references(() => checks.id),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  metadata: text("metadata", { mode: "json" }),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const backlogItems = sqliteTable("backlog_items", {
  id: text("id").primaryKey(),
  itemNumber: text("item_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority", {
    enum: ["critical", "high", "medium", "low"],
  }).notNull(),
  status: text("status", {
    enum: ["backlog", "in_progress", "done"],
  })
    .notNull()
    .default("backlog"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const feedback = sqliteTable("feedback", {
  id: text("id").primaryKey(),
  checkId: text("check_id").references(() => checks.id),
  category: text("category", {
    enum: ["works_well", "needs_improvement", "does_not_work"],
  }).notNull(),
  comment: text("comment").notNull(),
  page: text("page"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type Check = typeof checks.$inferSelect;
export type NewCheck = typeof checks.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type BacklogItem = typeof backlogItems.$inferSelect;
export type NewBacklogItem = typeof backlogItems.$inferInsert;
export type Feedback = typeof feedback.$inferSelect;
```

- [ ] **Step 3: Create database client**

Create `src/lib/db/index.ts`:

```typescript
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { existsSync, mkdirSync } from "fs";
import path from "path";

const dbDir = path.join(process.cwd(), "data");
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "fakecarrier.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
```

- [ ] **Step 4: Create seed script with pre-seeded backlog items**

Create `src/lib/db/seed.ts`:

```typescript
import { db } from "./index";
import { backlogItems } from "./schema";
import { generateId, formatBacklogNumber } from "../utils";
import { sql } from "drizzle-orm";

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
  // Create tables if they don't exist
  const sqliteDb = (db as any)._.session.client;
  sqliteDb.exec(`
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
```

- [ ] **Step 5: Generate and run migrations**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

- [ ] **Step 6: Run seed script**

```bash
npx tsx src/lib/db/seed.ts
```

Expected: "Seeded 15 backlog items."

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add database schema, Drizzle ORM setup, and seed backlog items"
```

---

### Task 3: Shared UI Components & Layout

**Files:**
- Create: `src/components/ui/button.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/card.tsx`, `src/components/ui/input.tsx`, `src/components/layout/header.tsx`, `src/components/layout/nav-links.tsx`, `src/components/layout/footer.tsx`
- Modify: `src/app/layout.tsx`
- Copy: Ecclesia logo SVGs to `public/`

- [ ] **Step 1: Copy Ecclesia logo files**

```bash
cp /Users/don/.claude/skills/brand-designer/references/logos/ecclesia/ecclesia-gruppe.svg /Users/don/FakeCarrier/public/ecclesia-logo.svg
cp /Users/don/.claude/skills/brand-designer/references/logos/ecclesia/logo-credit-weiss.png /Users/don/FakeCarrier/public/ecclesia-logo-white.png
```

- [ ] **Step 2: Create button component**

Create `src/components/ui/button.tsx`:

```tsx
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary: "bg-ec-dark-blue text-white hover:bg-ec-light-blue",
  secondary: "bg-ec-mint text-ec-dark-blue hover:bg-ec-light-green",
  outline: "border-2 border-ec-dark-blue text-ec-dark-blue hover:bg-ec-dark-blue hover:text-white",
  ghost: "text-ec-dark-blue hover:bg-ec-grey-40",
  danger: "bg-ec-error text-white hover:bg-red-700",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-lg font-inter font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ec-light-blue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
```

- [ ] **Step 3: Create badge component**

Create `src/components/ui/badge.tsx`:

```tsx
type BadgeVariant = "critical" | "high" | "medium" | "low" | "success" | "warning" | "info" | "neutral";

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  critical: "bg-ec-error/10 text-ec-error border-ec-error/20",
  high: "bg-ec-red/10 text-ec-red border-ec-red/20",
  medium: "bg-ec-yellow/20 text-yellow-700 border-ec-yellow/30",
  low: "bg-ec-light-green/20 text-ec-dark-green border-ec-light-green/30",
  success: "bg-ec-success/10 text-ec-success border-ec-success/20",
  warning: "bg-ec-warning/10 text-ec-warning border-ec-warning/20",
  info: "bg-ec-info/10 text-ec-info border-ec-info/20",
  neutral: "bg-ec-grey-40 text-ec-grey-80 border-ec-grey-60",
};

export function Badge({ variant, children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Create card component**

Create `src/components/ui/card.tsx`:

```tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-xl border border-ec-medium-grey bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardContent({ children, className = "" }: CardProps) {
  return <div className={className}>{children}</div>;
}
```

- [ ] **Step 5: Create input component**

Create `src/components/ui/input.tsx`:

```tsx
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-ec-grey-80">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border border-ec-grey-60 px-3 py-2 text-ec-grey-80 placeholder:text-ec-grey-70 focus:border-ec-light-blue focus:outline-none focus:ring-2 focus:ring-ec-light-blue/20 ${error ? "border-ec-error" : ""} ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-ec-error">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
```

- [ ] **Step 6: Create header component**

Create `src/components/layout/header.tsx`:

```tsx
import Image from "next/image";
import Link from "next/link";
import { NavLinks } from "./nav-links";

export function Header() {
  return (
    <header className="border-b border-ec-medium-grey bg-white">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/ecclesia-logo.svg"
            alt="Ecclesia Gruppe"
            width={140}
            height={32}
            priority
          />
          <span className="hidden font-barlow text-lg font-semibold text-ec-dark-blue sm:inline">
            Frachtführer-Prüfung
          </span>
        </Link>
        <NavLinks />
      </div>
    </header>
  );
}
```

- [ ] **Step 7: Create nav links component**

Create `src/components/layout/nav-links.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Start" },
  { href: "/check", label: "Neue Prüfung" },
  { href: "/history", label: "Verlauf" },
  { href: "/backlog", label: "Backlog" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {links.map((link) => {
        const isActive =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-ec-dark-blue text-white"
                : "text-ec-grey-80 hover:bg-ec-grey-40"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 8: Create footer component**

Create `src/components/layout/footer.tsx`:

```tsx
export function Footer() {
  return (
    <footer className="border-t border-ec-medium-grey bg-white py-4">
      <div className="mx-auto max-w-content px-6 text-center text-xs text-ec-grey-70">
        <p>Automatisierte Vorprüfung — keine Rechtsberatung</p>
        <p className="mt-1">&copy; {new Date().getFullYear()} Ecclesia Gruppe</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 9: Update root layout with header and footer**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frachtführer-Prüfung | Ecclesia Gruppe",
  description: "KI-gestützte Prüfung von Frachtführern zur Betrugsprävention",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Inter:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col bg-ec-light-grey font-inter">
        <Header />
        <main className="mx-auto w-full max-w-content flex-1 px-6 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 10: Verify layout renders**

```bash
npm run dev
```

Expected: Page shows Ecclesia logo in header, navigation links (Start, Neue Prüfung, Verlauf, Backlog), "Frachtführer-Prüfung" heading, and footer with disclaimer.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add Ecclesia-branded layout with header, nav, footer, and UI components"
```

---

### Task 4: Document Type Configuration & Provider Interface

**Files:**
- Create: `src/lib/config/document-types.ts`, `src/lib/analysis/providers/types.ts`, `src/lib/analysis/scoring.ts`

- [ ] **Step 1: Create document type configuration**

Create `src/lib/config/document-types.ts`:

```typescript
export interface DocumentTypeConfig {
  id: string;
  labelDe: string;
  labelEn: string;
  required: boolean;
  confidenceWeight: number;
  requiredFields: string[];
  optionalFields: string[];
  redFlagRules: string[];
}

export const DOCUMENT_TYPES: Record<string, DocumentTypeConfig> = {
  "insurance-cert": {
    id: "insurance-cert",
    labelDe: "Versicherungsnachweis",
    labelEn: "Insurance Certificate",
    required: true,
    confidenceWeight: 0.25,
    requiredFields: [
      "insurer",
      "policyNumber",
      "coveragePeriod",
      "coverageAmount",
      "insuredCompany",
      "contactInfo",
    ],
    optionalFields: ["coverageType", "deductible", "specialConditions"],
    redFlagRules: [
      "generic-form",
      "missing-logo",
      "expired-period",
      "company-name-mismatch",
      "short-coverage-period",
    ],
  },
  "transport-license": {
    id: "transport-license",
    labelDe: "EU-Transportlizenz",
    labelEn: "EU Transport License",
    required: false,
    confidenceWeight: 0.2,
    requiredFields: [
      "licenseNumber",
      "authority",
      "validityPeriod",
      "companyName",
      "companyAddress",
    ],
    optionalFields: ["vehicleCount", "trafficManager"],
    redFlagRules: ["fresh-license", "wrong-authority", "address-mismatch"],
  },
  letterhead: {
    id: "letterhead",
    labelDe: "Briefkopf / Unternehmensdaten",
    labelEn: "Company Letterhead",
    required: false,
    confidenceWeight: 0.15,
    requiredFields: [
      "companyName",
      "legalForm",
      "address",
      "phone",
      "email",
      "bankDetails",
    ],
    optionalFields: ["fax", "website", "registrationNumber", "vatId"],
    redFlagRules: [
      "iban-country-mismatch",
      "domain-name-mismatch",
      "multiple-name-variants",
      "edited-pdf",
    ],
  },
  "freight-profile": {
    id: "freight-profile",
    labelDe: "Frachtenbörsen-Profil",
    labelEn: "Freight Exchange Profile",
    required: false,
    confidenceWeight: 0.15,
    requiredFields: ["memberSince", "address", "contact", "legalForm"],
    optionalFields: ["activityDescription", "references", "rating"],
    redFlagRules: [
      "very-new-member",
      "mobile-only",
      "freemail-domain",
      "coworking-address",
    ],
  },
  communication: {
    id: "communication",
    labelDe: "Kommunikation / E-Mails",
    labelEn: "Communication / Emails",
    required: false,
    confidenceWeight: 0.1,
    requiredFields: ["senderEmail", "contactPerson"],
    optionalFields: ["emailDomain", "communicationChannel", "timestamps"],
    redFlagRules: [
      "freemail-address",
      "domain-mismatch",
      "unusual-hours",
      "changing-contacts",
      "spelling-patterns",
    ],
  },
  "driver-vehicle": {
    id: "driver-vehicle",
    labelDe: "Fahrer- & Fahrzeugdaten",
    labelEn: "Driver & Vehicle Data",
    required: false,
    confidenceWeight: 0.15,
    requiredFields: ["driverName", "driverId", "licensePlate", "vehicleType"],
    optionalFields: ["vin", "driverLicense", "vehiclePhotos", "vehiclePapers"],
    redFlagRules: [
      "plate-country-mismatch",
      "document-manipulation",
      "vehicle-type-mismatch",
    ],
  },
};

export function getDocumentType(id: string): DocumentTypeConfig | undefined {
  return DOCUMENT_TYPES[id];
}

export function getRequiredDocumentTypes(): DocumentTypeConfig[] {
  return Object.values(DOCUMENT_TYPES).filter((dt) => dt.required);
}

export function getAllDocumentTypes(): DocumentTypeConfig[] {
  return Object.values(DOCUMENT_TYPES);
}

export function getTotalConfidenceWeight(): number {
  return Object.values(DOCUMENT_TYPES).reduce(
    (sum, dt) => sum + dt.confidenceWeight,
    0
  );
}
```

- [ ] **Step 2: Create provider interface**

Create `src/lib/analysis/providers/types.ts`:

```typescript
export interface RiskSignal {
  severity: "critical" | "major" | "minor";
  rule: string;
  description: string;
  field?: string;
  points: number;
}

export interface ExtractionResult {
  fields: Record<string, unknown>;
  confidence: number;
  riskSignals: RiskSignal[];
  missingFields: string[];
}

export interface ProviderResult {
  providerId: string;
  documentType: string;
  extraction: ExtractionResult;
  rawResponse?: string;
}

export interface CrossCheckResult {
  consistencyScore: number;
  mismatches: Array<{
    field: string;
    documents: string[];
    values: string[];
    severity: "critical" | "major" | "minor";
    description: string;
  }>;
  patterns: string[];
}

export interface AnalysisProvider {
  id: string;
  name: string;
  analyze(
    documentPath: string,
    documentType: string,
    mimeType: string,
    carrierInfo: { name: string; country?: string; vatId?: string }
  ): Promise<ProviderResult>;
}

export interface GuidanceItem {
  tier: "ai_verified" | "human_required" | "outside_scope";
  labelDe: string;
  description: string;
  action?: string;
}

export interface AnalysisOutput {
  checkId: string;
  documentResults: ProviderResult[];
  crossCheck: CrossCheckResult;
  riskScore: number;
  confidenceLevel: number;
  recommendation: "approve" | "review" | "warning" | "reject";
  explanation: string;
  nextSteps: string[];
  guidance: GuidanceItem[];
}
```

- [ ] **Step 3: Create scoring engine**

Create `src/lib/analysis/scoring.ts`:

```typescript
import { DOCUMENT_TYPES, getTotalConfidenceWeight } from "@/lib/config/document-types";
import type {
  ProviderResult,
  CrossCheckResult,
  RiskSignal,
  GuidanceItem,
} from "./providers/types";

const SEVERITY_POINTS: Record<string, { min: number; max: number }> = {
  critical: { min: 30, max: 50 },
  major: { min: 15, max: 25 },
  minor: { min: 5, max: 10 },
};

export function calculateRiskScore(
  documentResults: ProviderResult[],
  crossCheck: CrossCheckResult
): number {
  let totalPoints = 0;

  for (const result of documentResults) {
    for (const signal of result.extraction.riskSignals) {
      totalPoints += signal.points;
    }
  }

  for (const mismatch of crossCheck.mismatches) {
    const range = SEVERITY_POINTS[mismatch.severity];
    if (range) {
      totalPoints += Math.round((range.min + range.max) / 2);
    }
  }

  return Math.min(100, totalPoints);
}

export function calculateConfidenceLevel(
  documentResults: ProviderResult[]
): number {
  const totalWeight = getTotalConfidenceWeight();
  let weightedConfidence = 0;

  for (const result of documentResults) {
    const docType = DOCUMENT_TYPES[result.documentType];
    if (!docType) continue;

    const docConfidence = result.extraction.confidence;
    weightedConfidence += (docType.confidenceWeight / totalWeight) * docConfidence;
  }

  return Math.round(weightedConfidence * 100);
}

export function determineRecommendation(
  riskScore: number,
  confidenceLevel: number
): "approve" | "review" | "warning" | "reject" {
  if (riskScore <= 25 && confidenceLevel >= 60) return "approve";
  if (riskScore >= 56 && confidenceLevel >= 40) return "reject";
  if (riskScore >= 56 && confidenceLevel < 40) return "warning";
  return "review";
}

export function getRiskLevel(score: number): "low" | "medium" | "high" {
  if (score <= 25) return "low";
  if (score <= 55) return "medium";
  return "high";
}

export function generateGuidance(
  documentResults: ProviderResult[],
  crossCheck: CrossCheckResult
): GuidanceItem[] {
  const guidance: GuidanceItem[] = [];

  // AI-verified items
  for (const result of documentResults) {
    const docType = DOCUMENT_TYPES[result.documentType];
    if (!docType) continue;

    const extractedCount = Object.keys(result.extraction.fields).length;
    if (extractedCount > 0) {
      guidance.push({
        tier: "ai_verified",
        labelDe: "Automatisch geprüft",
        description: `${docType.labelDe}: ${extractedCount} Felder extrahiert und geprüft`,
      });
    }
  }

  if (crossCheck.mismatches.length === 0 && documentResults.length > 1) {
    guidance.push({
      tier: "ai_verified",
      labelDe: "Automatisch geprüft",
      description: "Dokumentübergreifende Konsistenzprüfung bestanden",
    });
  }

  // Human-required items
  guidance.push({
    tier: "human_required",
    labelDe: "Ihre Aktion erforderlich",
    description: "Versicherungsschutz telefonisch beim Versicherer bestätigen lassen",
    action: "Rufen Sie den Versicherer unter der angegebenen Nummer an",
  });

  guidance.push({
    tier: "human_required",
    labelDe: "Ihre Aktion erforderlich",
    description: "Festnetznummer des Unternehmens durch Rückruf prüfen",
    action: "Rufen Sie die Festnetznummer am Firmensitz an",
  });

  guidance.push({
    tier: "human_required",
    labelDe: "Ihre Aktion erforderlich",
    description: "Personen- und Lieferdokumente bei Übergabe der Ware prüfen",
    action: "Personalausweis, Frachtbrief und Kennzeichen bei Übergabe kontrollieren",
  });

  // Outside scope items
  guidance.push({
    tier: "outside_scope",
    labelDe: "Außerhalb der Prüfmöglichkeit",
    description: "Aktuelle Solvenz und Zahlungsfähigkeit des Unternehmens",
  });

  guidance.push({
    tier: "outside_scope",
    labelDe: "Außerhalb der Prüfmöglichkeit",
    description: "Echtzeit-Fahrzeugortung und Sendungsverfolgung",
  });

  guidance.push({
    tier: "outside_scope",
    labelDe: "Außerhalb der Prüfmöglichkeit",
    description: "Strafrechtliche Vorgeschichte der beteiligten Personen",
  });

  return guidance;
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add document type config, provider interface, and scoring engine"
```

---

### Task 5: Claude Document Analysis Provider & Prompts

**Files:**
- Create: `src/lib/analysis/providers/claude-document.ts`, `src/lib/analysis/prompts/system.ts`, `src/lib/analysis/prompts/classify.ts`, `src/lib/analysis/prompts/insurance-cert.ts`, `src/lib/analysis/prompts/cross-check.ts`, `src/lib/analysis/prompts/chat.ts`, `src/lib/analysis/pipeline.ts`

- [ ] **Step 1: Create system prompt**

Create `src/lib/analysis/prompts/system.ts`:

```typescript
export const SYSTEM_PROMPT = `Du bist ein KI-Agent zur Prüfung von Frachtführern (Carrier Verification Agent).

Deine Aufgabe ist die dokumentbasierte Risikoanalyse von Frachtführern, um Betrug durch Phantomfrachtführer zu erkennen.

REGELN:
- Du analysierst NUR die vorgelegten Dokumente. Keine Spekulationen.
- Du darfst KEINE Rechtsberatung leisten.
- Du darfst KEINE Registerabfragen simulieren oder erfinden.
- Du darfst KEINE Entscheidungen im Namen des Nutzers treffen.
- Du musst bei widersprüchlichen Dokumenten sofort darauf hinweisen.
- Antworte IMMER auf Deutsch, auch wenn die Dokumente in anderen Sprachen sind.
- Gib bei jeder Bewertung die genaue Textstelle oder das Feld an, auf das du dich beziehst.

DREISTUFIGES LEITMODELL für jede Antwort:
1. "Automatisch geprüft" — Was du verifiziert hast
2. "Ihre Aktion erforderlich" — Was der Mensch noch tun muss
3. "Außerhalb der Prüfmöglichkeit" — Was mit diesem Tool nicht prüfbar ist

RISIKOSIGNALE bewerten als:
- Critical (30-50 Punkte): Adressmismatch über 2+ Dokumente, generischer Versicherungsnachweis, Domain-Spoofing + Tippfehler
- Major (15-25 Punkte): Nur Freemail + Mobilnummer, sehr frische Lizenz (<3 Monate), IBAN-Land unplausibel
- Minor (5-10 Punkte): Leichte Tippfehler, unklare Formatierung, einzelnes fehlendes Feld`;
```

- [ ] **Step 2: Create classification prompt**

Create `src/lib/analysis/prompts/classify.ts`:

```typescript
export const CLASSIFY_PROMPT = `Analysiere das hochgeladene Dokument und bestimme den Dokumenttyp.

Mögliche Typen:
- "insurance-cert": Versicherungsnachweis / Versicherungsbestätigung / CMR-Police
- "transport-license": EU-Transportlizenz / Gemeinschaftslizenz / Güterkraftverkehrslizenz
- "letterhead": Briefkopf / Firmenpapier / Geschäftspapier mit Unternehmensdaten
- "freight-profile": Frachtenbörsen-Profil (z.B. TIMOCOM, Trans.eu)
- "communication": E-Mail-Korrespondenz / Chat-Verläufe
- "driver-vehicle": Fahrerdokumente / Fahrzeugpapiere / Kennzeichen
- "unknown": Nicht zuordbar

Antworte NUR mit einem JSON-Objekt:
{
  "documentType": "der-typ-id",
  "confidence": 0.0-1.0,
  "reasoning": "Kurze Begründung auf Deutsch"
}`;
```

- [ ] **Step 3: Create insurance certificate analysis prompt**

Create `src/lib/analysis/prompts/insurance-cert.ts`:

```typescript
export const INSURANCE_CERT_PROMPT = `Analysiere diesen Versicherungsnachweis eines Frachtführers.

PFLICHTFELDER extrahieren:
- insurer: Name des Versicherers
- policyNumber: Policen-/Dokumentennummer
- coveragePeriod: Gültigkeitszeitraum (start und end als ISO-Datum)
- coverageAmount: Deckungssumme (Betrag und Währung)
- insuredCompany: Name des versicherten Unternehmens
- contactInfo: Kontaktdaten des Versicherers (Telefon, E-Mail, Adresse)

OPTIONALE FELDER:
- coverageType: Art der Versicherung (CMR, VKH, etc.)
- deductible: Selbstbeteiligung
- specialConditions: Besondere Bedingungen

RED FLAGS prüfen:
- generic-form: Generisches Formular ohne offizielles Versicherer-Layout → Major (20 Punkte)
- missing-logo: Fehlendes offizielles Logo oder Stempel → Minor (8 Punkte)
- expired-period: Gültigkeitszeitraum abgelaufen → Critical (40 Punkte)
- company-name-mismatch: Firmenname weicht vom angegebenen Carrier ab → Critical (35 Punkte)
- short-coverage-period: Sehr kurzer Versicherungszeitraum (<3 Monate) → Major (18 Punkte)

Antworte NUR mit einem JSON-Objekt:
{
  "fields": {
    "insurer": "Wert oder null",
    "policyNumber": "Wert oder null",
    "coveragePeriod": { "start": "ISO-Datum oder null", "end": "ISO-Datum oder null" },
    "coverageAmount": { "amount": number oder null, "currency": "EUR" },
    "insuredCompany": "Wert oder null",
    "contactInfo": { "phone": "Wert oder null", "email": "Wert oder null", "address": "Wert oder null" },
    "coverageType": "Wert oder null",
    "deductible": "Wert oder null",
    "specialConditions": "Wert oder null"
  },
  "confidence": 0.0-1.0,
  "missingFields": ["feldname1", "feldname2"],
  "riskSignals": [
    {
      "severity": "critical|major|minor",
      "rule": "rule-id",
      "description": "Beschreibung auf Deutsch",
      "field": "betroffenes-feld",
      "points": number
    }
  ],
  "summary": "Kurze Zusammenfassung der Analyse auf Deutsch"
}`;
```

- [ ] **Step 4: Create cross-check prompt**

Create `src/lib/analysis/prompts/cross-check.ts`:

```typescript
export function buildCrossCheckPrompt(
  extractedData: Array<{ documentType: string; fields: Record<string, unknown> }>
): string {
  const dataJson = JSON.stringify(extractedData, null, 2);

  return `Führe eine dokumentübergreifende Konsistenzprüfung durch.

Folgende Daten wurden aus den einzelnen Dokumenten extrahiert:
${dataJson}

PRÜFE auf:
1. Firmenname: Ist der Name in allen Dokumenten identisch? Varianten wie "TransLog GmbH" vs "Trans-Log GmbH" sind verdächtig.
2. Adresse: Stimmt die Adresse in allen Dokumenten überein?
3. E-Mail-Domain: Passt die Domain zur Firmenwebsite?
4. Zeiträume: Überlappen sich Lizenz- und Versicherungszeiträume mit dem geplanten Transport?
5. Muster: Wiederkehrende Tippfehler, ähnliche Formatfehler, gemischte Sprachen?

BEWERTE jeden Mismatch:
- critical: Firmenname oder Adresse unterschiedlich in 2+ Dokumenten
- major: E-Mail-Domain passt nicht, Zeitraum-Lücken
- minor: Kleine Schreibvarianten, fehlende optionale Felder

Antworte NUR mit einem JSON-Objekt:
{
  "consistencyScore": 0.0-1.0,
  "mismatches": [
    {
      "field": "feldname",
      "documents": ["doc-typ-1", "doc-typ-2"],
      "values": ["wert-1", "wert-2"],
      "severity": "critical|major|minor",
      "description": "Beschreibung auf Deutsch"
    }
  ],
  "patterns": ["Beschreibung erkannter Muster"]
}`;
}
```

- [ ] **Step 5: Create chat prompt**

Create `src/lib/analysis/prompts/chat.ts`:

```typescript
import type { AnalysisOutput } from "../providers/types";

export function buildChatPrompt(analysisOutput: AnalysisOutput): string {
  return `Du bist der Frachtführer-Prüfungsassistent. Der Nutzer hat eine Prüfung durchgeführt und hat Fragen.

PRÜFERGEBNIS:
- Risikoscore: ${analysisOutput.riskScore}/100
- Vertrauensniveau: ${analysisOutput.confidenceLevel}%
- Empfehlung: ${analysisOutput.recommendation}
- Erklärung: ${analysisOutput.explanation}

GEPRÜFTE DOKUMENTE:
${analysisOutput.documentResults
  .map(
    (r) =>
      `- ${r.documentType}: ${Object.keys(r.extraction.fields).length} Felder extrahiert, ${r.extraction.riskSignals.length} Risikosignale`
  )
  .join("\n")}

RISIKOSIGNALE:
${analysisOutput.documentResults
  .flatMap((r) =>
    r.extraction.riskSignals.map(
      (s) => `- [${s.severity}] ${s.description} (${s.rule}, ${s.points} Punkte)`
    )
  )
  .join("\n")}

NÄCHSTE SCHRITTE:
${analysisOutput.nextSteps.map((s) => `- ${s}`).join("\n")}

REGELN FÜR DIE KONVERSATION:
- Beantworte Fragen zu den Ergebnissen klar und präzise
- Verwende IMMER das Dreistufige Leitmodell (Automatisch geprüft / Ihre Aktion erforderlich / Außerhalb der Prüfmöglichkeit)
- Wenn der Nutzer ein neues Dokument hochlädt, analysiere es und aktualisiere die Bewertung
- Schlage konkrete nächste Schritte vor
- Gib KEINE Rechtsberatung`;
}
```

- [ ] **Step 6: Create Claude document analysis provider**

Create `src/lib/analysis/providers/claude-document.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import type { AnalysisProvider, ProviderResult, ExtractionResult } from "./types";
import { SYSTEM_PROMPT } from "../prompts/system";
import { CLASSIFY_PROMPT } from "../prompts/classify";
import { INSURANCE_CERT_PROMPT } from "../prompts/insurance-cert";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";

const client = new Anthropic();

function getAnalysisPrompt(documentType: string): string {
  const prompts: Record<string, string> = {
    "insurance-cert": INSURANCE_CERT_PROMPT,
  };

  return (
    prompts[documentType] ||
    buildGenericPrompt(documentType)
  );
}

function buildGenericPrompt(documentType: string): string {
  const config = DOCUMENT_TYPES[documentType];
  if (!config) {
    return "Analysiere dieses Dokument und extrahiere alle relevanten Informationen als JSON.";
  }

  return `Analysiere dieses Dokument vom Typ "${config.labelDe}".

PFLICHTFELDER extrahieren:
${config.requiredFields.map((f) => `- ${f}`).join("\n")}

OPTIONALE FELDER:
${config.optionalFields.map((f) => `- ${f}`).join("\n")}

RED FLAGS prüfen:
${config.redFlagRules.map((r) => `- ${r}`).join("\n")}

Antworte NUR mit einem JSON-Objekt:
{
  "fields": { ... },
  "confidence": 0.0-1.0,
  "missingFields": [...],
  "riskSignals": [
    { "severity": "critical|major|minor", "rule": "rule-id", "description": "Beschreibung", "field": "feld", "points": number }
  ],
  "summary": "Kurze Zusammenfassung"
}`;
}

function fileToBase64(filePath: string): string {
  const buffer = readFileSync(filePath);
  return buffer.toString("base64");
}

function getMimeType(mimeType: string): "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf" {
  const supported = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"] as const;
  const match = supported.find((m) => mimeType === m);
  return match || "application/pdf";
}

export async function classifyDocument(
  filePath: string,
  mimeType: string
): Promise<{ documentType: string; confidence: number }> {
  const base64 = fileToBase64(filePath);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: getMimeType(mimeType),
              data: base64,
            },
          },
          { type: "text", text: CLASSIFY_PROMPT },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { documentType: "unknown", confidence: 0 };
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    documentType: parsed.documentType || "unknown",
    confidence: parsed.confidence || 0,
  };
}

export const claudeDocumentProvider: AnalysisProvider = {
  id: "claude-document",
  name: "Claude Document Analysis",

  async analyze(
    documentPath: string,
    documentType: string,
    mimeType: string,
    carrierInfo: { name: string; country?: string; vatId?: string }
  ): Promise<ProviderResult> {
    const base64 = fileToBase64(documentPath);
    const prompt = getAnalysisPrompt(documentType);

    const carrierContext = `\n\nKONTEXT zum Frachtführer:\n- Name: ${carrierInfo.name}${carrierInfo.country ? `\n- Land: ${carrierInfo.country}` : ""}${carrierInfo.vatId ? `\n- USt-IdNr: ${carrierInfo.vatId}` : ""}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: getMimeType(mimeType),
                data: base64,
              },
            },
            { type: "text", text: prompt + carrierContext },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        providerId: "claude-document",
        documentType,
        extraction: {
          fields: {},
          confidence: 0,
          riskSignals: [],
          missingFields: [],
        },
        rawResponse: text,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const extraction: ExtractionResult = {
      fields: parsed.fields || {},
      confidence: parsed.confidence || 0,
      riskSignals: (parsed.riskSignals || []).map((s: any) => ({
        severity: s.severity || "minor",
        rule: s.rule || "unknown",
        description: s.description || "",
        field: s.field,
        points: s.points || 5,
      })),
      missingFields: parsed.missingFields || [],
    };

    return {
      providerId: "claude-document",
      documentType,
      extraction,
      rawResponse: text,
    };
  },
};
```

- [ ] **Step 7: Create analysis pipeline orchestrator**

Create `src/lib/analysis/pipeline.ts`:

```typescript
import { db } from "@/lib/db";
import { checks, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  claudeDocumentProvider,
  classifyDocument,
} from "./providers/claude-document";
import { buildCrossCheckPrompt } from "./prompts/cross-check";
import {
  calculateRiskScore,
  calculateConfidenceLevel,
  determineRecommendation,
  generateGuidance,
} from "./scoring";
import type {
  ProviderResult,
  CrossCheckResult,
  AnalysisOutput,
} from "./providers/types";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./prompts/system";

const client = new Anthropic();

export async function runAnalysisPipeline(
  checkId: string
): Promise<AnalysisOutput> {
  const check = db.query.checks.findFirst({
    where: eq(checks.id, checkId),
  });

  if (!check) throw new Error(`Check ${checkId} not found`);

  const docs = db
    .select()
    .from(documents)
    .where(eq(documents.checkId, checkId))
    .all();

  // Update check status
  db.update(checks)
    .set({ status: "analyzing", updatedAt: new Date().toISOString() })
    .where(eq(checks.id, checkId))
    .run();

  const documentResults: ProviderResult[] = [];

  // Phase 1: Classify and analyze each document
  for (const doc of docs) {
    db.update(documents)
      .set({ status: "analyzing" })
      .where(eq(documents.id, doc.id))
      .run();

    // Classify if not already typed
    let docType = doc.documentType;
    if (docType === "unknown" || !docType) {
      const classification = await classifyDocument(doc.filePath, doc.mimeType);
      docType = classification.documentType;
      db.update(documents)
        .set({ documentType: docType })
        .where(eq(documents.id, doc.id))
        .run();
    }

    // Analyze
    const result = await claudeDocumentProvider.analyze(
      doc.filePath,
      docType,
      doc.mimeType,
      {
        name: check.carrierName,
        country: check.carrierCountry || undefined,
        vatId: check.carrierVatId || undefined,
      }
    );

    documentResults.push(result);

    // Save results to document record
    db.update(documents)
      .set({
        documentType: docType,
        extractedFields: result.extraction.fields as any,
        riskSignals: result.extraction.riskSignals as any,
        documentScore: result.extraction.riskSignals.reduce(
          (sum, s) => sum + s.points,
          0
        ),
        confidence: result.extraction.confidence,
        status: "analyzed",
      })
      .where(eq(documents.id, doc.id))
      .run();
  }

  // Phase 2: Cross-document check
  let crossCheck: CrossCheckResult = {
    consistencyScore: 1,
    mismatches: [],
    patterns: [],
  };

  if (documentResults.length > 1) {
    const crossCheckPrompt = buildCrossCheckPrompt(
      documentResults.map((r) => ({
        documentType: r.documentType,
        fields: r.extraction.fields,
      }))
    );

    const crossCheckResponse = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: crossCheckPrompt }],
    });

    const ccText =
      crossCheckResponse.content[0].type === "text"
        ? crossCheckResponse.content[0].text
        : "";
    const ccJson = ccText.match(/\{[\s\S]*\}/);
    if (ccJson) {
      const parsed = JSON.parse(ccJson[0]);
      crossCheck = {
        consistencyScore: parsed.consistencyScore || 1,
        mismatches: parsed.mismatches || [],
        patterns: parsed.patterns || [],
      };
    }
  }

  // Phase 3: Score
  const riskScore = calculateRiskScore(documentResults, crossCheck);
  const confidenceLevel = calculateConfidenceLevel(documentResults);
  const recommendation = determineRecommendation(riskScore, confidenceLevel);
  const guidance = generateGuidance(documentResults, crossCheck);

  // Generate explanation and next steps
  const nextSteps = guidance
    .filter((g) => g.tier === "human_required" && g.action)
    .map((g) => g.action!);

  const explanation = generateExplanation(
    riskScore,
    confidenceLevel,
    recommendation,
    documentResults,
    crossCheck
  );

  // Update check with final results
  db.update(checks)
    .set({
      riskScore,
      confidenceLevel,
      recommendation,
      status: "completed",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(checks.id, checkId))
    .run();

  return {
    checkId,
    documentResults,
    crossCheck,
    riskScore,
    confidenceLevel,
    recommendation,
    explanation,
    nextSteps,
    guidance,
  };
}

function generateExplanation(
  riskScore: number,
  confidenceLevel: number,
  recommendation: string,
  results: ProviderResult[],
  crossCheck: CrossCheckResult
): string {
  const totalFlags = results.reduce(
    (sum, r) => sum + r.extraction.riskSignals.length,
    0
  );
  const criticalFlags = results.reduce(
    (sum, r) =>
      sum + r.extraction.riskSignals.filter((s) => s.severity === "critical").length,
    0
  );

  const parts: string[] = [];

  if (recommendation === "approve") {
    parts.push(
      `Die Prüfung ergab ein niedriges Risiko (${riskScore}/100) bei einem Vertrauensniveau von ${confidenceLevel}%.`
    );
  } else if (recommendation === "reject") {
    parts.push(
      `Die Prüfung ergab ein hohes Risiko (${riskScore}/100). ${criticalFlags} kritische Warnungen wurden gefunden.`
    );
  } else if (recommendation === "warning") {
    parts.push(
      `Hohes Risiko (${riskScore}/100) bei niedrigem Vertrauensniveau (${confidenceLevel}%). Weitere Dokumente werden dringend empfohlen.`
    );
  } else {
    parts.push(
      `Die Prüfung ergab ${totalFlags} Risikosignale. Eine manuelle Überprüfung wird empfohlen.`
    );
  }

  if (crossCheck.mismatches.length > 0) {
    parts.push(
      `${crossCheck.mismatches.length} Inkonsistenz(en) zwischen Dokumenten festgestellt.`
    );
  }

  parts.push(`${results.length} Dokument(e) analysiert.`);

  return parts.join(" ");
}
```

- [ ] **Step 8: Create remaining document type prompts**

Create `src/lib/analysis/prompts/transport-license.ts`:

```typescript
export const TRANSPORT_LICENSE_PROMPT = `Analysiere diese EU-Transportlizenz / Gemeinschaftslizenz eines Frachtführers.

PFLICHTFELDER extrahieren:
- licenseNumber: Lizenznummer
- authority: Ausstellende Behörde
- validityPeriod: Gültigkeitszeitraum (start und end als ISO-Datum)
- companyName: Name des Unternehmens
- companyAddress: Adresse des Unternehmens

OPTIONALE FELDER:
- vehicleCount: Anzahl der lizenzierten Fahrzeuge
- trafficManager: Name des Verkehrsleiters

RED FLAGS prüfen:
- fresh-license: Lizenz weniger als 3 Monate alt → Major (20 Punkte)
- wrong-authority: Behörde unplausibel für angegebenes Land → Critical (35 Punkte)
- address-mismatch: Adresse weicht von anderen Dokumenten ab → Critical (40 Punkte)

Antworte NUR mit einem JSON-Objekt:
{
  "fields": { ... },
  "confidence": 0.0-1.0,
  "missingFields": [...],
  "riskSignals": [
    { "severity": "critical|major|minor", "rule": "rule-id", "description": "Beschreibung", "field": "feld", "points": number }
  ],
  "summary": "Kurze Zusammenfassung"
}`;
```

Create `src/lib/analysis/prompts/letterhead.ts`:

```typescript
export const LETTERHEAD_PROMPT = `Analysiere diesen Briefkopf / dieses Geschäftspapier eines Frachtführers.

PFLICHTFELDER extrahieren:
- companyName: Offizieller Firmenname
- legalForm: Rechtsform (GmbH, Sp. z o.o., s.r.o., etc.)
- address: Vollständige Adresse
- phone: Telefonnummer
- email: E-Mail-Adresse
- bankDetails: Bankverbindung (IBAN, BIC, Bank)

OPTIONALE FELDER:
- fax: Faxnummer
- website: Webseite
- registrationNumber: Handelsregisternummer
- vatId: USt-IdNr.

RED FLAGS prüfen:
- iban-country-mismatch: IBAN-Ländercode passt nicht zum Firmensitz → Critical (35 Punkte)
- domain-name-mismatch: E-Mail-Domain passt nicht zum Firmennamen → Major (20 Punkte)
- multiple-name-variants: Firmenname in verschiedenen Schreibweisen → Major (18 Punkte)
- edited-pdf: Sichtbare Bearbeitungsspuren im PDF → Critical (40 Punkte)

Antworte NUR mit einem JSON-Objekt:
{
  "fields": { ... },
  "confidence": 0.0-1.0,
  "missingFields": [...],
  "riskSignals": [
    { "severity": "critical|major|minor", "rule": "rule-id", "description": "Beschreibung", "field": "feld", "points": number }
  ],
  "summary": "Kurze Zusammenfassung"
}`;
```

Create `src/lib/analysis/prompts/freight-profile.ts`:

```typescript
export const FREIGHT_PROFILE_PROMPT = `Analysiere dieses Frachtenbörsen-Profil (z.B. TIMOCOM, Trans.eu) eines Frachtführers.

PFLICHTFELDER extrahieren:
- memberSince: Mitglied seit (Datum)
- address: Adresse
- contact: Kontaktperson/Ansprechpartner
- legalForm: Rechtsform

OPTIONALE FELDER:
- activityDescription: Tätigkeitsbeschreibung
- references: Referenzen
- rating: Bewertung auf der Plattform

RED FLAGS prüfen:
- very-new-member: Mitglied seit weniger als 6 Monaten → Major (18 Punkte)
- mobile-only: Nur Mobilfunknummer, keine Festnetznummer → Major (15 Punkte)
- freemail-domain: Freemail-Adresse (Gmail, GMX, Hotmail etc.) → Major (15 Punkte)
- coworking-address: Adresse eines Bürocenters oder Coworking-Space → Minor (10 Punkte)

Antworte NUR mit einem JSON-Objekt:
{
  "fields": { ... },
  "confidence": 0.0-1.0,
  "missingFields": [...],
  "riskSignals": [
    { "severity": "critical|major|minor", "rule": "rule-id", "description": "Beschreibung", "field": "feld", "points": number }
  ],
  "summary": "Kurze Zusammenfassung"
}`;
```

Create `src/lib/analysis/prompts/communication.ts`:

```typescript
export const COMMUNICATION_PROMPT = `Analysiere diese E-Mail-Korrespondenz oder Kommunikation mit einem Frachtführer.

PFLICHTFELDER extrahieren:
- senderEmail: E-Mail-Adresse des Absenders
- contactPerson: Name des Ansprechpartners

OPTIONALE FELDER:
- emailDomain: Domain der E-Mail-Adresse
- communicationChannel: Kommunikationskanal (E-Mail, WhatsApp, Telefon)
- timestamps: Zeitpunkte der Kommunikation

RED FLAGS prüfen:
- freemail-address: Freemail-Adresse (Gmail, GMX, Hotmail) → Major (15 Punkte)
- domain-mismatch: E-Mail-Domain stimmt nicht mit Firmenwebsite überein → Major (20 Punkte)
- unusual-hours: Kommunikation nur zu ungewöhnlichen Zeiten (z.B. 0:00-5:00) → Minor (8 Punkte)
- changing-contacts: Wechselnde Ansprechpartner → Minor (10 Punkte)
- spelling-patterns: Auffällige wiederkehrende Rechtschreibfehler → Minor (8 Punkte)

Antworte NUR mit einem JSON-Objekt:
{
  "fields": { ... },
  "confidence": 0.0-1.0,
  "missingFields": [...],
  "riskSignals": [
    { "severity": "critical|major|minor", "rule": "rule-id", "description": "Beschreibung", "field": "feld", "points": number }
  ],
  "summary": "Kurze Zusammenfassung"
}`;
```

Create `src/lib/analysis/prompts/driver-vehicle.ts`:

```typescript
export const DRIVER_VEHICLE_PROMPT = `Analysiere diese Fahrer- und Fahrzeugdaten eines Frachtführers.

PFLICHTFELDER extrahieren:
- driverName: Name des Fahrers
- driverId: Personalausweis-/Passnummer
- licensePlate: Kennzeichen des Fahrzeugs
- vehicleType: Fahrzeugtyp (LKW, Sattelzug, etc.)

OPTIONALE FELDER:
- vin: Fahrzeugidentifizierungsnummer (VIN)
- driverLicense: Führerscheinnummer
- vehiclePhotos: Beschreibung der Fotos (falls vorhanden)
- vehiclePapers: Fahrzeugpapiere vorhanden?

RED FLAGS prüfen:
- plate-country-mismatch: Kennzeichen passt nicht zum Herkunftsland des Unternehmens → Major (20 Punkte)
- document-manipulation: Sichtbare Manipulationen an Dokumenten → Critical (45 Punkte)
- vehicle-type-mismatch: Fahrzeugtyp unpassend für die Transportart → Minor (10 Punkte)

Antworte NUR mit einem JSON-Objekt:
{
  "fields": { ... },
  "confidence": 0.0-1.0,
  "missingFields": [...],
  "riskSignals": [
    { "severity": "critical|major|minor", "rule": "rule-id", "description": "Beschreibung", "field": "feld", "points": number }
  ],
  "summary": "Kurze Zusammenfassung"
}`;
```

- [ ] **Step 9: Register all prompts in the provider**

Update the `getAnalysisPrompt` function in `src/lib/analysis/providers/claude-document.ts` to import and map all prompt files:

```typescript
import { TRANSPORT_LICENSE_PROMPT } from "../prompts/transport-license";
import { LETTERHEAD_PROMPT } from "../prompts/letterhead";
import { FREIGHT_PROFILE_PROMPT } from "../prompts/freight-profile";
import { COMMUNICATION_PROMPT } from "../prompts/communication";
import { DRIVER_VEHICLE_PROMPT } from "../prompts/driver-vehicle";

// Update the prompts map in getAnalysisPrompt:
const prompts: Record<string, string> = {
  "insurance-cert": INSURANCE_CERT_PROMPT,
  "transport-license": TRANSPORT_LICENSE_PROMPT,
  "letterhead": LETTERHEAD_PROMPT,
  "freight-profile": FREIGHT_PROFILE_PROMPT,
  "communication": COMMUNICATION_PROMPT,
  "driver-vehicle": DRIVER_VEHICLE_PROMPT,
};
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add Claude analysis provider, all 6 document type prompts, and pipeline orchestrator"
```

---

### Task 6: Upload API Route

**Files:**
- Create: `src/app/api/upload/route.ts`

- [ ] **Step 1: Create upload API route**

Create `src/app/api/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { documents, checks } from "@/lib/db/schema";
import { generateId, formatCheckNumber } from "@/lib/utils";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll("files") as File[];
  let checkId = formData.get("checkId") as string | null;
  const carrierName = formData.get("carrierName") as string | null;
  const carrierCountry = formData.get("carrierCountry") as string | null;
  const carrierVatId = formData.get("carrierVatId") as string | null;

  if (files.length === 0) {
    return NextResponse.json({ error: "Keine Dateien hochgeladen" }, { status: 400 });
  }

  // Create check if not exists
  if (!checkId) {
    checkId = generateId();

    // Get next check number
    const result = db
      .select({ count: sql<number>`count(*)` })
      .from(checks)
      .get();
    const seq = (result?.count || 0) + 1;

    db.insert(checks)
      .values({
        id: checkId,
        checkNumber: formatCheckNumber(seq),
        carrierName: carrierName || "Unbekannt",
        carrierCountry,
        carrierVatId,
        status: "draft",
      })
      .run();
  } else if (carrierName) {
    // Update carrier info if provided
    db.update(checks)
      .set({
        carrierName,
        carrierCountry,
        carrierVatId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(checks.id, checkId))
      .run();
  }

  const uploadDir = path.join(process.cwd(), "uploads", checkId);
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  const uploadedDocs = [];

  for (const file of files) {
    const docId = generateId();
    const ext = path.extname(file.name) || ".bin";
    const fileName = `${docId}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(filePath, buffer);

    const doc = {
      id: docId,
      checkId,
      documentType: "unknown",
      fileName: file.name,
      filePath,
      mimeType: file.type || "application/octet-stream",
      status: "uploaded" as const,
    };

    db.insert(documents).values(doc).run();
    uploadedDocs.push(doc);
  }

  const check = db.query.checks.findFirst({
    where: eq(checks.id, checkId),
  });

  return NextResponse.json({
    checkId,
    checkNumber: check?.checkNumber,
    documents: uploadedDocs.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      mimeType: d.mimeType,
      documentType: d.documentType,
    })),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add file upload API route with check creation"
```

---

### Task 7: Analysis API Route (Streaming)

**Files:**
- Create: `src/app/api/analyze/route.ts`

- [ ] **Step 1: Create analysis API route with streaming**

Create `src/app/api/analyze/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { checks, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { classifyDocument } from "@/lib/analysis/providers/claude-document";
import { claudeDocumentProvider } from "@/lib/analysis/providers/claude-document";
import { buildCrossCheckPrompt } from "@/lib/analysis/prompts/cross-check";
import {
  calculateRiskScore,
  calculateConfidenceLevel,
  determineRecommendation,
  generateGuidance,
} from "@/lib/analysis/scoring";
import { SYSTEM_PROMPT } from "@/lib/analysis/prompts/system";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  const { checkId } = await request.json();

  const check = db.query.checks.findFirst({
    where: eq(checks.id, checkId),
  });

  if (!check) {
    return new Response(JSON.stringify({ error: "Check not found" }), {
      status: 404,
    });
  }

  if (!check.carrierName || check.carrierName === "Unbekannt") {
    return new Response(
      JSON.stringify({ error: "Carrier name is required before analysis" }),
      { status: 400 }
    );
  }

  const docs = db
    .select()
    .from(documents)
    .where(eq(documents.checkId, checkId))
    .all();

  if (docs.length === 0) {
    return new Response(
      JSON.stringify({ error: "No documents uploaded" }),
      { status: 400 }
    );
  }

  // Stream progress updates via Server-Sent Events
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(type: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, ...data as object })}\n\n`)
        );
      }

      try {
        // Update status
        db.update(checks)
          .set({ status: "analyzing", updatedAt: new Date().toISOString() })
          .where(eq(checks.id, checkId))
          .run();

        sendEvent("status", { message: "Analyse gestartet", step: "analyzing" });

        const documentResults = [];

        // Analyze each document
        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          sendEvent("document_start", {
            documentId: doc.id,
            fileName: doc.fileName,
            index: i,
            total: docs.length,
          });

          // Classify
          let docType = doc.documentType;
          if (docType === "unknown") {
            const classification = await classifyDocument(
              doc.filePath,
              doc.mimeType
            );
            docType = classification.documentType;
            sendEvent("document_classified", {
              documentId: doc.id,
              documentType: docType,
              confidence: classification.confidence,
            });
          }

          // Analyze
          db.update(documents)
            .set({ status: "analyzing", documentType: docType })
            .where(eq(documents.id, doc.id))
            .run();

          const result = await claudeDocumentProvider.analyze(
            doc.filePath,
            docType,
            doc.mimeType,
            {
              name: check.carrierName,
              country: check.carrierCountry || undefined,
              vatId: check.carrierVatId || undefined,
            }
          );

          documentResults.push(result);

          // Save to DB
          db.update(documents)
            .set({
              documentType: docType,
              extractedFields: result.extraction.fields as any,
              riskSignals: result.extraction.riskSignals as any,
              documentScore: result.extraction.riskSignals.reduce(
                (sum, s) => sum + s.points,
                0
              ),
              confidence: result.extraction.confidence,
              status: "analyzed",
            })
            .where(eq(documents.id, doc.id))
            .run();

          sendEvent("document_analyzed", {
            documentId: doc.id,
            documentType: docType,
            fieldsExtracted: Object.keys(result.extraction.fields).length,
            riskSignals: result.extraction.riskSignals.length,
            confidence: result.extraction.confidence,
          });
        }

        // Cross-check
        sendEvent("status", { message: "Dokumentübergreifende Prüfung", step: "cross_check" });

        let crossCheck = { consistencyScore: 1, mismatches: [] as any[], patterns: [] as string[] };

        if (documentResults.length > 1) {
          const crossCheckPrompt = buildCrossCheckPrompt(
            documentResults.map((r) => ({
              documentType: r.documentType,
              fields: r.extraction.fields,
            }))
          );

          const ccResponse = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: crossCheckPrompt }],
          });

          const ccText =
            ccResponse.content[0].type === "text"
              ? ccResponse.content[0].text
              : "";
          const ccJson = ccText.match(/\{[\s\S]*\}/);
          if (ccJson) {
            crossCheck = JSON.parse(ccJson[0]);
          }
        }

        // Score
        sendEvent("status", { message: "Bewertung wird erstellt", step: "scoring" });

        const riskScore = calculateRiskScore(documentResults, crossCheck);
        const confidenceLevel = calculateConfidenceLevel(documentResults);
        const recommendation = determineRecommendation(riskScore, confidenceLevel);
        const guidance = generateGuidance(documentResults, crossCheck);
        const nextSteps = guidance
          .filter((g) => g.tier === "human_required" && g.action)
          .map((g) => g.action!);

        // Update check
        db.update(checks)
          .set({
            riskScore,
            confidenceLevel,
            recommendation,
            status: "completed",
            updatedAt: new Date().toISOString(),
          })
          .where(eq(checks.id, checkId))
          .run();

        sendEvent("completed", {
          riskScore,
          confidenceLevel,
          recommendation,
          nextSteps,
          guidance,
        });
      } catch (error) {
        sendEvent("error", {
          message: error instanceof Error ? error.message : "Analyse fehlgeschlagen",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add streaming analysis API route with SSE progress events"
```

---

### Task 8: Check Wizard Page (Upload + Analysis)

**Files:**
- Create: `src/components/check/progress-bar.tsx`, `src/components/check/file-dropzone.tsx`, `src/components/check/carrier-form.tsx`, `src/components/check/document-list.tsx`, `src/components/check/analysis-stream.tsx`, `src/app/check/page.tsx`

- [ ] **Step 1: Create progress bar component**

Create `src/components/check/progress-bar.tsx`:

```tsx
interface ProgressBarProps {
  currentStep: number;
}

const steps = [
  { number: 1, label: "Dokumente hochladen" },
  { number: 2, label: "Analyse läuft" },
  { number: 3, label: "Ergebnis & Empfehlung" },
  { number: 4, label: "Bericht" },
];

export function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  step.number < currentStep
                    ? "bg-ec-mint text-ec-dark-blue"
                    : step.number === currentStep
                      ? "bg-ec-dark-blue text-white"
                      : "bg-ec-grey-40 text-ec-grey-70"
                }`}
              >
                {step.number < currentStep ? "✓" : step.number}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  step.number <= currentStep
                    ? "text-ec-dark-blue"
                    : "text-ec-grey-70"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 ${
                  step.number < currentStep ? "bg-ec-mint" : "bg-ec-grey-40"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create file dropzone component**

Create `src/components/check/file-dropzone.tsx`:

```tsx
"use client";

import { useCallback, useState } from "react";

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function FileDropzone({ onFilesSelected, disabled }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files);
      onFilesSelected(files);
    },
    [onFilesSelected, disabled]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        onFilesSelected(Array.from(e.target.files));
      }
    },
    [onFilesSelected]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`relative rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
        disabled
          ? "border-ec-grey-60 bg-ec-grey-40 cursor-not-allowed"
          : isDragging
            ? "border-ec-light-blue bg-ec-light-blue/5"
            : "border-ec-grey-60 bg-white hover:border-ec-dark-blue"
      }`}
    >
      <div className="space-y-4">
        <div className="text-4xl">📄</div>
        <div>
          <p className="text-lg font-medium text-ec-dark-blue">
            Dokumente hier ablegen
          </p>
          <p className="mt-1 text-sm text-ec-grey-70">
            PDF, Bilder oder Scans — mehrere Dateien gleichzeitig möglich
          </p>
        </div>
        <label
          className={`inline-flex cursor-pointer items-center rounded-lg bg-ec-dark-blue px-4 py-2 text-sm font-medium text-white hover:bg-ec-light-blue ${disabled ? "pointer-events-none opacity-50" : ""}`}
        >
          Dateien auswählen
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
            onChange={handleFileInput}
            disabled={disabled}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create carrier form component**

Create `src/components/check/carrier-form.tsx`:

```tsx
"use client";

import { Input } from "@/components/ui/input";

interface CarrierFormProps {
  carrierName: string;
  carrierCountry: string;
  carrierVatId: string;
  onChange: (field: string, value: string) => void;
  disabled?: boolean;
}

export function CarrierForm({
  carrierName,
  carrierCountry,
  carrierVatId,
  onChange,
  disabled,
}: CarrierFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-barlow text-lg font-semibold text-ec-dark-blue">
        Frachtführer-Informationen
      </h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="Firmenname *"
          value={carrierName}
          onChange={(e) => onChange("carrierName", e.target.value)}
          placeholder="z.B. TransLog Sp. z o.o."
          disabled={disabled}
        />
        <Input
          label="Land"
          value={carrierCountry}
          onChange={(e) => onChange("carrierCountry", e.target.value)}
          placeholder="z.B. Polen"
          disabled={disabled}
        />
        <Input
          label="USt-IdNr."
          value={carrierVatId}
          onChange={(e) => onChange("carrierVatId", e.target.value)}
          placeholder="z.B. PL1234567890"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create document list component**

Create `src/components/check/document-list.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";

interface UploadedDoc {
  id: string;
  fileName: string;
  mimeType: string;
  documentType: string;
  status?: string;
}

interface DocumentListProps {
  documents: UploadedDoc[];
}

export function DocumentList({ documents }: DocumentListProps) {
  if (documents.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-barlow text-lg font-semibold text-ec-dark-blue">
        Hochgeladene Dokumente ({documents.length})
      </h3>
      <div className="space-y-2">
        {documents.map((doc) => {
          const typeConfig = DOCUMENT_TYPES[doc.documentType];
          return (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border border-ec-medium-grey bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {doc.mimeType.startsWith("image/") ? "🖼️" : "📄"}
                </span>
                <span className="text-sm font-medium text-ec-grey-80">
                  {doc.fileName}
                </span>
              </div>
              <Badge variant={typeConfig ? "info" : "neutral"}>
                {typeConfig?.labelDe || "Wird klassifiziert..."}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create analysis stream component**

Create `src/components/check/analysis-stream.tsx`:

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";

interface AnalysisEvent {
  type: string;
  [key: string]: unknown;
}

interface AnalysisStreamProps {
  events: AnalysisEvent[];
  isAnalyzing: boolean;
}

export function AnalysisStream({ events, isAnalyzing }: AnalysisStreamProps) {
  if (events.length === 0 && !isAnalyzing) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-barlow text-lg font-semibold text-ec-dark-blue">
        Analyseverlauf
      </h3>
      <div className="space-y-2">
        {events.map((event, i) => (
          <AnalysisEventItem key={i} event={event} />
        ))}
        {isAnalyzing && (
          <div className="flex items-center gap-2 text-sm text-ec-grey-70">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ec-dark-blue border-t-transparent" />
            Analyse läuft...
          </div>
        )}
      </div>
    </div>
  );
}

function AnalysisEventItem({ event }: { event: AnalysisEvent }) {
  switch (event.type) {
    case "document_classified": {
      const typeConfig = DOCUMENT_TYPES[event.documentType as string];
      return (
        <div className="flex items-center gap-2 text-sm">
          <span>🏷️</span>
          <span>
            Dokument erkannt als:{" "}
            <strong>{typeConfig?.labelDe || (event.documentType as string)}</strong>
          </span>
          <Badge variant="info">
            {Math.round((event.confidence as number) * 100)}%
          </Badge>
        </div>
      );
    }
    case "document_analyzed":
      return (
        <div className="flex items-center gap-2 text-sm">
          <span>✅</span>
          <span>
            {(event.fieldsExtracted as number)} Felder extrahiert,{" "}
            {(event.riskSignals as number)} Risikosignale
          </span>
          {(event.riskSignals as number) > 0 && (
            <Badge variant="warning">{event.riskSignals as number} Warnungen</Badge>
          )}
        </div>
      );
    case "status":
      return (
        <div className="flex items-center gap-2 text-sm text-ec-grey-70">
          <span>ℹ️</span>
          <span>{event.message as string}</span>
        </div>
      );
    case "error":
      return (
        <div className="flex items-center gap-2 text-sm text-ec-error">
          <span>❌</span>
          <span>{event.message as string}</span>
        </div>
      );
    default:
      return null;
  }
}
```

- [ ] **Step 6: Create check wizard page**

Create `src/app/check/page.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/check/progress-bar";
import { FileDropzone } from "@/components/check/file-dropzone";
import { CarrierForm } from "@/components/check/carrier-form";
import { DocumentList } from "@/components/check/document-list";
import { AnalysisStream } from "@/components/check/analysis-stream";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface UploadedDoc {
  id: string;
  fileName: string;
  mimeType: string;
  documentType: string;
}

export default function CheckPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [checkId, setCheckId] = useState<string | null>(null);
  const [carrierName, setCarrierName] = useState("");
  const [carrierCountry, setCarrierCountry] = useState("");
  const [carrierVatId, setCarrierVatId] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisEvents, setAnalysisEvents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      if (checkId) formData.append("checkId", checkId);
      if (carrierName) formData.append("carrierName", carrierName);
      if (carrierCountry) formData.append("carrierCountry", carrierCountry);
      if (carrierVatId) formData.append("carrierVatId", carrierVatId);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Upload fehlgeschlagen");
          return;
        }

        setCheckId(data.checkId);
        setUploadedDocs((prev) => [...prev, ...data.documents]);
      } catch (err) {
        setError("Upload fehlgeschlagen. Bitte versuchen Sie es erneut.");
      } finally {
        setIsUploading(false);
      }
    },
    [checkId, carrierName, carrierCountry, carrierVatId]
  );

  const handleFieldChange = useCallback((field: string, value: string) => {
    if (field === "carrierName") setCarrierName(value);
    if (field === "carrierCountry") setCarrierCountry(value);
    if (field === "carrierVatId") setCarrierVatId(value);
  }, []);

  const startAnalysis = useCallback(async () => {
    if (!checkId || !carrierName.trim()) {
      setError("Bitte geben Sie den Firmennamen des Frachtführers ein.");
      return;
    }

    // Update carrier name if not sent during upload
    await fetch("/api/upload", {
      method: "POST",
      body: (() => {
        const fd = new FormData();
        fd.append("checkId", checkId);
        fd.append("carrierName", carrierName);
        if (carrierCountry) fd.append("carrierCountry", carrierCountry);
        if (carrierVatId) fd.append("carrierVatId", carrierVatId);
        fd.append("files", new Blob(), ""); // empty to trigger update only
        return fd;
      })(),
    });

    setStep(2);
    setIsAnalyzing(true);
    setAnalysisEvents([]);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkId }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            setAnalysisEvents((prev) => [...prev, data]);

            if (data.type === "completed") {
              setIsAnalyzing(false);
              setStep(3);
              // Redirect to results
              setTimeout(() => router.push(`/results/${checkId}`), 1500);
            }

            if (data.type === "error") {
              setIsAnalyzing(false);
              setError(data.message);
            }
          }
        }
      }
    } catch (err) {
      setIsAnalyzing(false);
      setError("Analyse fehlgeschlagen. Bitte versuchen Sie es erneut.");
    }
  }, [checkId, carrierName, carrierCountry, carrierVatId, router]);

  return (
    <div>
      <ProgressBar currentStep={step} />

      <div className="space-y-6">
        {step === 1 && (
          <>
            <Card>
              <CarrierForm
                carrierName={carrierName}
                carrierCountry={carrierCountry}
                carrierVatId={carrierVatId}
                onChange={handleFieldChange}
                disabled={isUploading}
              />
            </Card>

            <Card>
              <FileDropzone
                onFilesSelected={handleFilesSelected}
                disabled={isUploading}
              />
            </Card>

            <DocumentList documents={uploadedDocs} />

            {error && (
              <p className="text-sm text-ec-error">{error}</p>
            )}

            {uploadedDocs.length > 0 && (
              <div className="flex justify-end">
                <Button
                  onClick={startAnalysis}
                  disabled={isUploading || !uploadedDocs.length}
                  size="lg"
                >
                  {isUploading ? "Wird hochgeladen..." : "Analyse starten"}
                </Button>
              </div>
            )}
          </>
        )}

        {step >= 2 && (
          <Card>
            <AnalysisStream
              events={analysisEvents}
              isAnalyzing={isAnalyzing}
            />
            {error && (
              <p className="mt-4 text-sm text-ec-error">{error}</p>
            )}
            {step === 3 && (
              <p className="mt-4 text-sm text-ec-success font-medium">
                ✅ Analyse abgeschlossen. Weiterleitung zum Ergebnis...
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify check wizard renders**

```bash
npm run dev
```

Navigate to http://localhost:3000/check. Expected: progress bar at step 1, carrier form, file dropzone.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add check wizard with upload, carrier form, progress bar, and streaming analysis"
```

---

### Task 9: Results Dashboard Page

**Files:**
- Create: `src/components/results/risk-confidence-chart.tsx`, `src/components/results/recommendation-banner.tsx`, `src/components/results/document-card.tsx`, `src/components/results/missing-docs.tsx`, `src/components/results/next-steps.tsx`, `src/components/results/guidance-tier.tsx`, `src/app/results/[id]/page.tsx`, `src/app/api/checks/route.ts`

This task is large — the results dashboard is the most complex page. Build it component by component.

- [ ] **Step 1: Create checks API route**

Create `src/app/api/checks/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checks, documents } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const check = db.query.checks.findFirst({
      where: eq(checks.id, id),
    });

    if (!check) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const docs = db
      .select()
      .from(documents)
      .where(eq(documents.checkId, id))
      .all();

    return NextResponse.json({ check, documents: docs });
  }

  const allChecks = db
    .select()
    .from(checks)
    .orderBy(desc(checks.createdAt))
    .all();

  return NextResponse.json({ checks: allChecks });
}
```

- [ ] **Step 2: Create risk-confidence chart component**

Create `src/components/results/risk-confidence-chart.tsx`:

```tsx
interface RiskConfidenceChartProps {
  riskScore: number;
  confidenceLevel: number;
}

export function RiskConfidenceChart({
  riskScore,
  confidenceLevel,
}: RiskConfidenceChartProps) {
  // Map scores to chart coordinates
  // X axis: confidence (0-100) maps to 60-380
  // Y axis: risk (0-100) maps to 360-40 (inverted, high risk = top)
  const x = 60 + (confidenceLevel / 100) * 320;
  const y = 360 - (riskScore / 100) * 320;

  return (
    <div className="w-full max-w-md mx-auto">
      <svg viewBox="0 0 440 420" className="w-full">
        {/* Gradient zone backgrounds */}
        <defs>
          <radialGradient id="safeZone" cx="100%" cy="100%" r="100%">
            <stop offset="0%" style={{ stopColor: "#005E47", stopOpacity: 0.2 }} />
            <stop offset="40%" style={{ stopColor: "#FFCF31", stopOpacity: 0.15 }} />
            <stop offset="70%" style={{ stopColor: "#F75880", stopOpacity: 0.15 }} />
            <stop offset="100%" style={{ stopColor: "#E02E2A", stopOpacity: 0.2 }} />
          </radialGradient>
        </defs>

        <rect x="60" y="40" width="320" height="320" fill="url(#safeZone)" rx="8" />

        {/* Diagonal zone lines */}
        <line x1="60" y1="200" x2="220" y2="360" stroke="#005E47" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.5" />
        <line x1="60" y1="100" x2="320" y2="360" stroke="#FFCF31" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.5" />
        <line x1="60" y1="40" x2="380" y2="360" stroke="#E02E2A" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.5" />

        {/* Zone labels */}
        <text x="320" y="340" fill="#005E47" fontSize="12" fontWeight="700" opacity="0.7">FREIGEBEN</text>
        <text x="310" y="250" fill="#EF6C00" fontSize="12" fontWeight="700" opacity="0.7">PRÜFEN</text>
        <text x="320" y="160" fill="#F75880" fontSize="12" fontWeight="700" opacity="0.7">WARNUNG</text>
        <text x="280" y="70" fill="#E02E2A" fontSize="12" fontWeight="700" opacity="0.7">ABLEHNEN</text>

        {/* Axes */}
        <line x1="60" y1="360" x2="380" y2="360" stroke="#3B3B3B" strokeWidth="2" />
        <line x1="60" y1="40" x2="60" y2="360" stroke="#3B3B3B" strokeWidth="2" />

        {/* Axis labels */}
        <text x="220" y="400" textAnchor="middle" fill="#3B3B3B" fontSize="13" fontWeight="600">
          Vertrauensniveau
        </text>
        <text x="15" y="200" textAnchor="middle" fill="#3B3B3B" fontSize="13" fontWeight="600" transform="rotate(-90,15,200)">
          Risikoscore
        </text>

        {/* Axis ticks */}
        <text x="60" y="380" textAnchor="middle" fill="#979797" fontSize="10">0%</text>
        <text x="220" y="380" textAnchor="middle" fill="#979797" fontSize="10">50%</text>
        <text x="380" y="380" textAnchor="middle" fill="#979797" fontSize="10">100%</text>
        <text x="48" y="364" textAnchor="end" fill="#979797" fontSize="10">0</text>
        <text x="48" y="204" textAnchor="end" fill="#979797" fontSize="10">50</text>
        <text x="48" y="48" textAnchor="end" fill="#979797" fontSize="10">100</text>

        {/* Carrier dot */}
        <circle cx={x} cy={y} r="14" fill="#2649A5" stroke="white" strokeWidth="3" />
        <text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize="9" fontWeight="700">
          FF
        </text>

        {/* Score labels near dot */}
        <text x={x} y={y - 22} textAnchor="middle" fill="#2649A5" fontSize="11" fontWeight="600">
          {riskScore} / {confidenceLevel}%
        </text>
      </svg>
    </div>
  );
}
```

- [ ] **Step 3: Create recommendation banner component**

Create `src/components/results/recommendation-banner.tsx`:

```tsx
type Recommendation = "approve" | "review" | "warning" | "reject";

interface RecommendationBannerProps {
  recommendation: Recommendation;
  explanation: string;
  riskScore: number;
  confidenceLevel: number;
}

const config: Record<Recommendation, { label: string; bg: string; text: string; border: string }> = {
  approve: {
    label: "FREIGEBEN",
    bg: "bg-ec-dark-green/10",
    text: "text-ec-dark-green",
    border: "border-ec-dark-green/30",
  },
  review: {
    label: "PRÜFEN",
    bg: "bg-ec-yellow/15",
    text: "text-yellow-700",
    border: "border-ec-yellow/30",
  },
  warning: {
    label: "WARNUNG",
    bg: "bg-ec-warning/10",
    text: "text-ec-warning",
    border: "border-ec-warning/30",
  },
  reject: {
    label: "ABLEHNEN",
    bg: "bg-ec-error/10",
    text: "text-ec-error",
    border: "border-ec-error/30",
  },
};

export function RecommendationBanner({
  recommendation,
  explanation,
  riskScore,
  confidenceLevel,
}: RecommendationBannerProps) {
  const c = config[recommendation];

  return (
    <div className={`rounded-xl border-2 ${c.border} ${c.bg} p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <span className={`font-barlow text-2xl font-bold ${c.text}`}>
            {c.label}
          </span>
          <p className="mt-2 text-sm text-ec-grey-80">{explanation}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-ec-grey-70">Risiko</div>
          <div className={`text-2xl font-bold ${c.text}`}>{riskScore}/100</div>
          <div className="mt-1 text-sm text-ec-grey-70">Vertrauen</div>
          <div className="text-2xl font-bold text-ec-dark-blue">{confidenceLevel}%</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create document card component**

Create `src/components/results/document-card.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";

interface DocumentCardProps {
  document: {
    id: string;
    documentType: string;
    fileName: string;
    extractedFields: Record<string, unknown> | null;
    riskSignals: Array<{
      severity: string;
      rule: string;
      description: string;
      field?: string;
      points: number;
    }> | null;
    documentScore: number | null;
    confidence: number | null;
  };
}

export function DocumentCard({ document: doc }: DocumentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const typeConfig = DOCUMENT_TYPES[doc.documentType];
  const signals = doc.riskSignals || [];
  const fields = doc.extractedFields || {};

  return (
    <Card className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">
            {isExpanded ? "▼" : "▶"}
          </span>
          <div>
            <h4 className="font-barlow font-semibold text-ec-dark-blue">
              {typeConfig?.labelDe || doc.documentType}
            </h4>
            <p className="text-xs text-ec-grey-70">{doc.fileName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {signals.length > 0 && (
            <Badge variant={signals.some((s) => s.severity === "critical") ? "critical" : "warning"}>
              {signals.length} {signals.length === 1 ? "Signal" : "Signale"}
            </Badge>
          )}
          {doc.confidence !== null && (
            <Badge variant="info">
              {Math.round(doc.confidence * 100)}% Konfidenz
            </Badge>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4 border-t border-ec-medium-grey pt-4" onClick={(e) => e.stopPropagation()}>
          {/* Extracted fields */}
          {Object.keys(fields).length > 0 && (
            <div>
              <h5 className="mb-2 text-sm font-semibold text-ec-grey-80">
                Extrahierte Felder
              </h5>
              <div className="grid gap-2 text-sm">
                {Object.entries(fields).map(([key, value]) => (
                  <div key={key} className="flex justify-between rounded bg-ec-light-grey px-3 py-1.5">
                    <span className="text-ec-grey-70">{key}</span>
                    <span className="font-medium text-ec-grey-80">
                      {typeof value === "object" ? JSON.stringify(value) : String(value || "—")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk signals */}
          {signals.length > 0 && (
            <div>
              <h5 className="mb-2 text-sm font-semibold text-ec-grey-80">
                Risikosignale
              </h5>
              <div className="space-y-2">
                {signals.map((signal, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-ec-medium-grey p-3"
                  >
                    <Badge
                      variant={
                        signal.severity === "critical"
                          ? "critical"
                          : signal.severity === "major"
                            ? "high"
                            : "medium"
                      }
                    >
                      {signal.severity === "critical"
                        ? "Kritisch"
                        : signal.severity === "major"
                          ? "Schwer"
                          : "Gering"}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm">{signal.description}</p>
                      <p className="mt-0.5 text-xs text-ec-grey-70">
                        Regel: {signal.rule} • {signal.points} Punkte
                        {signal.field && ` • Feld: ${signal.field}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 5: Create guidance tier component**

Create `src/components/results/guidance-tier.tsx`:

```tsx
interface GuidanceItem {
  tier: "ai_verified" | "human_required" | "outside_scope";
  labelDe: string;
  description: string;
  action?: string;
}

interface GuidanceTierProps {
  guidance: GuidanceItem[];
}

const tierConfig = {
  ai_verified: {
    icon: "🤖",
    label: "Automatisch geprüft",
    bg: "bg-ec-info/5",
    border: "border-ec-info/20",
    text: "text-ec-info",
  },
  human_required: {
    icon: "👤",
    label: "Ihre Aktion erforderlich",
    bg: "bg-ec-warning/5",
    border: "border-ec-warning/20",
    text: "text-ec-warning",
  },
  outside_scope: {
    icon: "⚠️",
    label: "Außerhalb der Prüfmöglichkeit",
    bg: "bg-ec-grey-40",
    border: "border-ec-grey-60",
    text: "text-ec-grey-70",
  },
};

export function GuidanceTier({ guidance }: GuidanceTierProps) {
  const grouped = {
    ai_verified: guidance.filter((g) => g.tier === "ai_verified"),
    human_required: guidance.filter((g) => g.tier === "human_required"),
    outside_scope: guidance.filter((g) => g.tier === "outside_scope"),
  };

  return (
    <div className="space-y-4">
      <h3 className="font-barlow text-xl font-semibold text-ec-dark-blue">
        Prüfübersicht
      </h3>
      {(Object.entries(grouped) as [keyof typeof tierConfig, GuidanceItem[]][]).map(
        ([tier, items]) => {
          if (items.length === 0) return null;
          const config = tierConfig[tier];
          return (
            <div
              key={tier}
              className={`rounded-xl border ${config.border} ${config.bg} p-4`}
            >
              <h4 className={`mb-2 font-semibold ${config.text}`}>
                {config.icon} {config.label}
              </h4>
              <ul className="space-y-1.5">
                {items.map((item, i) => (
                  <li key={i} className="text-sm text-ec-grey-80">
                    {item.description}
                    {item.action && (
                      <span className="ml-1 font-medium text-ec-dark-blue">
                        → {item.action}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create missing docs component**

Create `src/components/results/missing-docs.tsx`:

```tsx
import { DOCUMENT_TYPES } from "@/lib/config/document-types";

interface MissingDocsProps {
  providedTypes: string[];
}

export function MissingDocs({ providedTypes }: MissingDocsProps) {
  const allTypes = Object.values(DOCUMENT_TYPES);
  const missing = allTypes.filter((dt) => !providedTypes.includes(dt.id));

  if (missing.length === 0) return null;

  const missingWeight = missing.reduce((sum, dt) => sum + dt.confidenceWeight, 0);
  const impactPercent = Math.round(missingWeight * 100);

  return (
    <div className="rounded-xl border border-ec-yellow/30 bg-ec-yellow/5 p-4">
      <h3 className="font-barlow font-semibold text-yellow-700">
        Fehlende Dokumente ({missing.length})
      </h3>
      <p className="mt-1 text-sm text-ec-grey-70">
        Durch fehlende Dokumente ist das Vertrauensniveau um bis zu {impactPercent}% reduziert.
      </p>
      <ul className="mt-3 space-y-1">
        {missing.map((dt) => (
          <li key={dt.id} className="flex items-center justify-between text-sm">
            <span className="text-ec-grey-80">{dt.labelDe}</span>
            <span className="text-ec-grey-70">+{Math.round(dt.confidenceWeight * 100)}% Vertrauen</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 7: Create next-steps component**

Create `src/components/results/next-steps.tsx`:

```tsx
interface NextStepsProps {
  steps: string[];
}

export function NextSteps({ steps }: NextStepsProps) {
  if (steps.length === 0) return null;

  return (
    <div className="rounded-xl border border-ec-light-blue/20 bg-ec-light-blue/5 p-4">
      <h3 className="font-barlow font-semibold text-ec-dark-blue">
        Nächste Schritte
      </h3>
      <ul className="mt-3 space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ec-dark-blue text-xs text-white">
              {i + 1}
            </span>
            <span className="text-ec-grey-80">{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 8: Create results dashboard page**

Create `src/app/results/[id]/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProgressBar } from "@/components/check/progress-bar";
import { RiskConfidenceChart } from "@/components/results/risk-confidence-chart";
import { RecommendationBanner } from "@/components/results/recommendation-banner";
import { DocumentCard } from "@/components/results/document-card";
import { MissingDocs } from "@/components/results/missing-docs";
import { NextSteps } from "@/components/results/next-steps";
import { GuidanceTier } from "@/components/results/guidance-tier";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateGuidance } from "@/lib/analysis/scoring";

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [check, setCheck] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/checks?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCheck(data.check);
        setDocs(data.documents || []);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-ec-dark-blue border-t-transparent" />
      </div>
    );
  }

  if (!check) {
    return <p className="text-center text-ec-error">Prüfung nicht gefunden.</p>;
  }

  const providedTypes = docs.map((d: any) => d.documentType).filter((t: string) => t !== "unknown");

  // Build guidance from stored results
  const guidance = [
    { tier: "ai_verified" as const, labelDe: "Automatisch geprüft", description: `${docs.length} Dokument(e) analysiert und geprüft` },
    { tier: "human_required" as const, labelDe: "Ihre Aktion erforderlich", description: "Versicherungsschutz telefonisch beim Versicherer bestätigen lassen", action: "Rufen Sie den Versicherer unter der angegebenen Nummer an" },
    { tier: "human_required" as const, labelDe: "Ihre Aktion erforderlich", description: "Festnetznummer des Unternehmens durch Rückruf prüfen", action: "Rufen Sie die Festnetznummer am Firmensitz an" },
    { tier: "human_required" as const, labelDe: "Ihre Aktion erforderlich", description: "Personen- und Lieferdokumente bei Übergabe der Ware prüfen", action: "Personalausweis, Frachtbrief und Kennzeichen bei Übergabe kontrollieren" },
    { tier: "outside_scope" as const, labelDe: "Außerhalb der Prüfmöglichkeit", description: "Aktuelle Solvenz und Zahlungsfähigkeit des Unternehmens" },
    { tier: "outside_scope" as const, labelDe: "Außerhalb der Prüfmöglichkeit", description: "Echtzeit-Fahrzeugortung und Sendungsverfolgung" },
    { tier: "outside_scope" as const, labelDe: "Außerhalb der Prüfmöglichkeit", description: "Strafrechtliche Vorgeschichte der beteiligten Personen" },
  ];

  const nextSteps = guidance
    .filter((g) => g.tier === "human_required" && g.action)
    .map((g) => g.action!);

  return (
    <div>
      <ProgressBar currentStep={3} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-barlow text-3xl font-bold text-ec-dark-blue">
              {check.carrierName}
            </h1>
            <p className="text-sm text-ec-grey-70">
              {check.checkNumber} • {new Date(check.createdAt).toLocaleDateString("de-DE")}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.open(`/api/report/${id}`, "_blank")}
          >
            PDF Report herunterladen
          </Button>
        </div>

        {/* Recommendation */}
        {check.recommendation && (
          <RecommendationBanner
            recommendation={check.recommendation}
            explanation={`Die Prüfung ergab ${docs.length} analysierte Dokumente mit einem Risikoscore von ${check.riskScore}/100 und einem Vertrauensniveau von ${check.confidenceLevel}%.`}
            riskScore={check.riskScore || 0}
            confidenceLevel={check.confidenceLevel || 0}
          />
        )}

        {/* Chart + Guidance side by side */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="mb-4 font-barlow text-xl font-semibold text-ec-dark-blue">
              Risiko-Vertrauens-Matrix
            </h3>
            <RiskConfidenceChart
              riskScore={check.riskScore || 0}
              confidenceLevel={check.confidenceLevel || 0}
            />
          </Card>
          <div className="space-y-4">
            <NextSteps steps={nextSteps} />
            <MissingDocs providedTypes={providedTypes} />
          </div>
        </div>

        {/* Guidance */}
        <GuidanceTier guidance={guidance} />

        {/* Document cards */}
        <div className="space-y-3">
          <h3 className="font-barlow text-xl font-semibold text-ec-dark-blue">
            Dokumentanalyse
          </h3>
          {docs.map((doc: any) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>

        {/* Chat button */}
        <div className="text-center">
          <Button variant="secondary" size="lg">
            💬 Chat mit Agent
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Verify results page renders**

```bash
npm run dev
```

Navigate to http://localhost:3000/results/test — should show "Prüfung nicht gefunden" (no data yet, but confirms routing works).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add results dashboard with risk chart, recommendation banner, guidance, and document cards"
```

---

### Task 10: Chat Mode

**Files:**
- Create: `src/components/results/chat-panel.tsx`, `src/app/api/chat/route.ts`
- Modify: `src/app/results/[id]/page.tsx`

- [ ] **Step 1: Create chat API route**

Create `src/app/api/chat/route.ts`:

```typescript
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { checks, documents, chatMessages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SYSTEM_PROMPT } from "@/lib/analysis/prompts/system";
import { generateId } from "@/lib/utils";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  const { checkId, message } = await request.json();

  const check = db.query.checks.findFirst({ where: eq(checks.id, checkId) });
  if (!check) {
    return new Response(JSON.stringify({ error: "Check not found" }), { status: 404 });
  }

  const docs = db.select().from(documents).where(eq(documents.checkId, checkId)).all();
  const history = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.checkId, checkId))
    .all();

  // Save user message
  db.insert(chatMessages).values({
    id: generateId(),
    checkId,
    role: "user",
    content: message,
  }).run();

  // Build context
  const contextPrompt = `PRÜFERGEBNIS für ${check.carrierName}:
- Risikoscore: ${check.riskScore}/100
- Vertrauensniveau: ${check.confidenceLevel}%
- Empfehlung: ${check.recommendation}
- Dokumente: ${docs.length} analysiert

DOKUMENTDETAILS:
${docs.map((d) => `- ${d.documentType}: ${d.fileName} (Score: ${d.documentScore}, Konfidenz: ${d.confidence})`).join("\n")}

Verwende IMMER das Dreistufige Leitmodell in deinen Antworten.`;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: contextPrompt },
    { role: "assistant", content: "Verstanden. Ich werde die Prüfergebnisse als Kontext verwenden und das Dreistufige Leitmodell anwenden." },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages,
        stream: true,
      });

      for await (const event of response) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          fullResponse += event.delta.text;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
        }
      }

      // Save assistant message
      db.insert(chatMessages).values({
        id: generateId(),
        checkId,
        role: "assistant",
        content: fullResponse,
      }).run();

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Create chat panel component**

Create `src/components/results/chat-panel.tsx`:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  checkId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPanel({ checkId, isOpen, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkId, message: userMessage }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                assistantMessage += data.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantMessage,
                  };
                  return updated;
                });
              }
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Fehler bei der Verbindung. Bitte versuchen Sie es erneut." },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-ec-medium-grey bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ec-medium-grey bg-ec-dark-blue px-4 py-3">
        <h3 className="font-barlow text-lg font-semibold text-white">
          Chat mit Agent
        </h3>
        <button onClick={onClose} className="text-white hover:text-ec-mint">
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-ec-grey-70">
            Stellen Sie Fragen zu den Prüfergebnissen.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-lg p-3 text-sm ${
              msg.role === "user"
                ? "ml-8 bg-ec-dark-blue text-white"
                : "mr-8 bg-ec-light-grey text-ec-grey-80"
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-ec-medium-grey p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Frage eingeben..."
            disabled={isStreaming}
            className="flex-1 rounded-lg border border-ec-grey-60 px-3 py-2 text-sm focus:border-ec-light-blue focus:outline-none"
          />
          <Button onClick={sendMessage} disabled={isStreaming} size="sm">
            {isStreaming ? "..." : "→"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire chat panel into results page**

Add state and panel to `src/app/results/[id]/page.tsx`. Add these imports at the top:

```tsx
import { ChatPanel } from "@/components/results/chat-panel";
```

Add state after the existing useState hooks:

```tsx
const [isChatOpen, setIsChatOpen] = useState(false);
```

Replace the chat button at the bottom with:

```tsx
{/* Chat button + panel */}
<div className="text-center">
  <Button variant="secondary" size="lg" onClick={() => setIsChatOpen(true)}>
    💬 Chat mit Agent
  </Button>
</div>
<ChatPanel checkId={id} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
```

- [ ] **Step 4: Add document upload capability to chat panel**

Add a file input to the chat panel that triggers re-analysis. In `src/components/results/chat-panel.tsx`, add after the text input area:

```tsx
{/* Add inside the input div, before the send button */}
<label className="cursor-pointer rounded-lg px-2 py-2 text-ec-grey-70 hover:bg-ec-grey-40">
  📎
  <input
    type="file"
    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
    className="hidden"
    onChange={async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("files", file);
      formData.append("checkId", checkId);

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (uploadRes.ok) {
        // Trigger re-analysis message
        const msg = `Neues Dokument hochgeladen: ${file.name}. Bitte analysiere es und aktualisiere die Bewertung.`;
        setInput(msg);
      }
    }}
  />
</label>
```

Note: Full re-scoring integration (updating the results dashboard live after a chat upload) is complex and can be deferred to a post-MVP iteration. For the MVP, the chat agent will acknowledge the new document and describe its findings textually.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add chat mode with streaming Claude responses, document upload, and side panel UI"
```

---

### Task 11: Home Page & History Page

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/history/page.tsx`

- [ ] **Step 1: Build the home page**

Replace `src/app/page.tsx`:

```tsx
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { checks } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const totalChecks = db
    .select({ count: sql<number>`count(*)` })
    .from(checks)
    .get();

  const recentChecks = db
    .select()
    .from(checks)
    .orderBy(desc(checks.createdAt))
    .limit(5)
    .all();

  const recBadge: Record<string, { variant: "success" | "warning" | "high" | "critical"; label: string }> = {
    approve: { variant: "success", label: "Freigeben" },
    review: { variant: "warning", label: "Prüfen" },
    warning: { variant: "high", label: "Warnung" },
    reject: { variant: "critical", label: "Ablehnen" },
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-2xl bg-ec-dark-blue p-8 text-center text-white">
        <h1 className="font-barlow text-4xl font-bold">
          Frachtführer-Prüfung
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-ec-mint">
          KI-gestützte Überprüfung von Frachtführern zur Erkennung von
          Phantomfrachtführern und zur Dokumentation der Sorgfaltspflicht.
        </p>
        <Link href="/check">
          <Button variant="secondary" size="lg" className="mt-6">
            Neue Prüfung starten
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-center">
            <div className="font-barlow text-3xl font-bold text-ec-dark-blue">
              {totalChecks?.count || 0}
            </div>
            <div className="text-sm text-ec-grey-70">Prüfungen durchgeführt</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="font-barlow text-3xl font-bold text-ec-dark-blue">
              {recentChecks.filter((c) => c.recommendation === "reject").length}
            </div>
            <div className="text-sm text-ec-grey-70">Abgelehnt (letzte 5)</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="font-barlow text-3xl font-bold text-ec-dark-blue">
              {recentChecks.filter((c) => c.recommendation === "approve").length}
            </div>
            <div className="text-sm text-ec-grey-70">Freigegeben (letzte 5)</div>
          </div>
        </Card>
      </div>

      {/* Recent checks */}
      {recentChecks.length > 0 && (
        <Card>
          <h2 className="mb-4 font-barlow text-xl font-semibold text-ec-dark-blue">
            Letzte Prüfungen
          </h2>
          <div className="space-y-2">
            {recentChecks.map((check) => (
              <Link
                key={check.id}
                href={`/results/${check.id}`}
                className="flex items-center justify-between rounded-lg border border-ec-medium-grey px-4 py-3 hover:bg-ec-light-grey"
              >
                <div>
                  <span className="font-medium text-ec-grey-80">
                    {check.carrierName}
                  </span>
                  <span className="ml-2 text-xs text-ec-grey-70">
                    {check.checkNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {check.recommendation && (
                    <Badge variant={recBadge[check.recommendation]?.variant || "neutral"}>
                      {recBadge[check.recommendation]?.label || check.recommendation}
                    </Badge>
                  )}
                  <span className="text-xs text-ec-grey-70">
                    {new Date(check.createdAt).toLocaleDateString("de-DE")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <Link
            href="/history"
            className="mt-4 block text-center text-sm font-medium text-ec-light-blue hover:underline"
          >
            Alle Prüfungen anzeigen →
          </Link>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build the history page**

Create `src/app/history/page.tsx`:

```tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { checks } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default function HistoryPage() {
  const allChecks = db
    .select()
    .from(checks)
    .orderBy(desc(checks.createdAt))
    .all();

  const recBadge: Record<string, { variant: "success" | "warning" | "high" | "critical"; label: string }> = {
    approve: { variant: "success", label: "Freigeben" },
    review: { variant: "warning", label: "Prüfen" },
    warning: { variant: "high", label: "Warnung" },
    reject: { variant: "critical", label: "Ablehnen" },
  };

  return (
    <div>
      <h1 className="mb-6 font-barlow text-3xl font-bold text-ec-dark-blue">
        Prüfverlauf
      </h1>

      {allChecks.length === 0 ? (
        <Card>
          <p className="text-center text-ec-grey-70">
            Noch keine Prüfungen durchgeführt.{" "}
            <Link href="/check" className="text-ec-light-blue hover:underline">
              Jetzt starten →
            </Link>
          </p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ec-medium-grey text-xs uppercase text-ec-grey-70">
                  <th className="px-4 py-3">Nr.</th>
                  <th className="px-4 py-3">Frachtführer</th>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Risiko</th>
                  <th className="px-4 py-3">Vertrauen</th>
                  <th className="px-4 py-3">Empfehlung</th>
                </tr>
              </thead>
              <tbody>
                {allChecks.map((check) => (
                  <tr
                    key={check.id}
                    className="border-b border-ec-grey-40 hover:bg-ec-light-grey"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/results/${check.id}`}
                        className="font-medium text-ec-light-blue hover:underline"
                      >
                        {check.checkNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-ec-grey-80">
                      {check.carrierName}
                    </td>
                    <td className="px-4 py-3 text-ec-grey-70">
                      {new Date(check.createdAt).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-4 py-3">
                      {check.riskScore !== null ? `${check.riskScore}/100` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {check.confidenceLevel !== null ? `${check.confidenceLevel}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {check.recommendation ? (
                        <Badge variant={recBadge[check.recommendation]?.variant || "neutral"}>
                          {recBadge[check.recommendation]?.label || check.recommendation}
                        </Badge>
                      ) : (
                        <Badge variant="neutral">Offen</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add home page with stats and history page with check table"
```

---

### Task 12: Backlog Kanban Board

**Files:**
- Create: `src/app/backlog/page.tsx`, `src/components/backlog/kanban-board.tsx`, `src/components/backlog/kanban-column.tsx`, `src/components/backlog/kanban-card.tsx`, `src/components/backlog/add-item-form.tsx`, `src/app/api/backlog/route.ts`

- [ ] **Step 1: Create backlog API route**

Create `src/app/api/backlog/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { backlogItems } from "@/lib/db/schema";
import { eq, sql, asc } from "drizzle-orm";
import { generateId, formatBacklogNumber } from "@/lib/utils";

export async function GET() {
  const items = db
    .select()
    .from(backlogItems)
    .orderBy(asc(backlogItems.sortOrder))
    .all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.action === "create") {
    const count = db.select({ count: sql<number>`count(*)` }).from(backlogItems).get();
    const seq = (count?.count || 0) + 1;

    const item = {
      id: generateId(),
      itemNumber: formatBacklogNumber(seq),
      title: body.title,
      description: body.description || null,
      priority: body.priority || "medium",
      status: "backlog" as const,
      sortOrder: seq,
    };

    db.insert(backlogItems).values(item).run();
    return NextResponse.json({ item });
  }

  if (body.action === "update") {
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.status) updates.status = body.status;
    if (body.priority) updates.priority = body.priority;
    if (body.title) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

    db.update(backlogItems)
      .set(updates)
      .where(eq(backlogItems.id, body.id))
      .run();

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
```

- [ ] **Step 2: Create kanban card component**

Create `src/components/backlog/kanban-card.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";

interface KanbanCardProps {
  item: {
    id: string;
    itemNumber: string;
    title: string;
    description: string | null;
    priority: string;
  };
  onDragStart: (e: React.DragEvent, id: string) => void;
}

const priorityVariant: Record<string, "critical" | "high" | "medium" | "low"> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
};

export function KanbanCard({ item, onDragStart }: KanbanCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      className="cursor-grab rounded-lg border border-ec-medium-grey bg-white p-3 shadow-sm hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-mono text-ec-grey-70">{item.itemNumber}</span>
        <Badge variant={priorityVariant[item.priority] || "neutral"}>
          {item.priority}
        </Badge>
      </div>
      <h4 className="mt-1 text-sm font-medium text-ec-grey-80">{item.title}</h4>
      {item.description && (
        <p className="mt-1 text-xs text-ec-grey-70 line-clamp-2">
          {item.description}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create kanban column component**

Create `src/components/backlog/kanban-column.tsx`:

```tsx
import { KanbanCard } from "./kanban-card";

interface KanbanColumnProps {
  title: string;
  status: string;
  items: Array<{
    id: string;
    itemNumber: string;
    title: string;
    description: string | null;
    priority: string;
    status: string;
  }>;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
}

export function KanbanColumn({ title, status, items, onDragStart, onDrop }: KanbanColumnProps) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e, status)}
      className="flex flex-col rounded-xl bg-ec-grey-40 p-3"
    >
      <h3 className="mb-3 font-barlow text-sm font-semibold uppercase text-ec-grey-70">
        {title} ({items.length})
      </h3>
      <div className="flex-1 space-y-2 min-h-[200px]">
        {items.map((item) => (
          <KanbanCard key={item.id} item={item} onDragStart={onDragStart} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create add item form**

Create `src/components/backlog/add-item-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddItemFormProps {
  onAdd: (title: string, priority: string, description: string) => void;
}

export function AddItemForm({ onAdd }: AddItemFormProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd(title, priority, description);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        + Neuer Eintrag
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-ec-medium-grey bg-white p-4 space-y-3">
      <Input
        label="Titel"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Was muss getan werden?"
      />
      <Input
        label="Beschreibung"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Details (optional)"
      />
      <div className="space-y-1">
        <label className="block text-sm font-medium text-ec-grey-80">Priorität</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full rounded-lg border border-ec-grey-60 px-3 py-2 text-sm"
        >
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSubmit} size="sm">Hinzufügen</Button>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>Abbrechen</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create backlog page**

Create `src/app/backlog/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { KanbanColumn } from "@/components/backlog/kanban-column";
import { AddItemForm } from "@/components/backlog/add-item-form";

interface BacklogItem {
  id: string;
  itemNumber: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  sortOrder: number;
}

const columns = [
  { status: "backlog", title: "Backlog" },
  { status: "in_progress", title: "In Arbeit" },
  { status: "done", title: "Erledigt" },
];

export default function BacklogPage() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const loadItems = useCallback(async () => {
    const res = await fetch("/api/backlog");
    const data = await res.json();
    setItems(data.items);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (!draggedId) return;

    await fetch("/api/backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: draggedId, status: newStatus }),
    });

    setItems((prev) =>
      prev.map((item) =>
        item.id === draggedId ? { ...item, status: newStatus } : item
      )
    );
    setDraggedId(null);
  };

  const handleAdd = async (title: string, priority: string, description: string) => {
    await fetch("/api/backlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", title, priority, description }),
    });
    loadItems();
  };

  const filteredItems = filter === "all"
    ? items
    : items.filter((i) => i.priority === filter);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-barlow text-3xl font-bold text-ec-dark-blue">
          Backlog
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-ec-grey-70">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-ec-grey-60 px-3 py-1.5 text-sm"
          >
            <option value="all">Alle</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <AddItemForm onAdd={handleAdd} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((col) => (
          <KanbanColumn
            key={col.status}
            title={col.title}
            status={col.status}
            items={filteredItems.filter((i) => i.status === col.status)}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add backlog kanban board with drag-and-drop, priorities, and auto-numbering"
```

---

### Task 13: PDF Report Generation

**Files:**
- Create: `src/lib/pdf/report.tsx`, `src/lib/pdf/generate.ts`, `src/app/api/report/[id]/route.ts`

- [ ] **Step 1: Create PDF report components**

Create `src/lib/pdf/report.tsx`:

```tsx
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hiA.woff2", fontWeight: 700 },
  ],
});

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Inter", fontSize: 10, color: "#3B3B3B" },
  header: { fontSize: 24, fontWeight: 700, color: "#2649A5", marginBottom: 8 },
  subheader: { fontSize: 14, fontWeight: 700, color: "#2649A5", marginBottom: 6, marginTop: 16 },
  text: { fontSize: 10, lineHeight: 1.5, marginBottom: 4 },
  badge: { fontSize: 9, padding: "3 8", borderRadius: 4, fontWeight: 700, color: "#FFFFFF" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", padding: "4 8", backgroundColor: "#F7F7F7", marginBottom: 2, borderRadius: 3 },
  fieldLabel: { fontSize: 9, color: "#979797" },
  fieldValue: { fontSize: 9, fontWeight: 700, color: "#3B3B3B" },
  signal: { padding: 6, marginBottom: 4, borderRadius: 4, borderWidth: 1, borderColor: "#E2E2E2" },
  signalSeverity: { fontSize: 8, fontWeight: 700, marginBottom: 2 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#979797" },
  disclaimer: { fontSize: 8, color: "#979797", textAlign: "center", marginTop: 20 },
});

const recColors: Record<string, string> = {
  approve: "#005E47",
  review: "#EF6C00",
  warning: "#F75880",
  reject: "#E02E2A",
};

const recLabels: Record<string, string> = {
  approve: "FREIGEBEN",
  review: "PRÜFEN",
  warning: "WARNUNG",
  reject: "ABLEHNEN",
};

interface ReportProps {
  check: {
    checkNumber: string;
    carrierName: string;
    riskScore: number | null;
    confidenceLevel: number | null;
    recommendation: string | null;
    createdAt: string;
  };
  documents: Array<{
    documentType: string;
    fileName: string;
    extractedFields: Record<string, unknown> | null;
    riskSignals: Array<{ severity: string; rule: string; description: string; points: number }> | null;
    confidence: number | null;
  }>;
}

export function CarrierReport({ check, documents }: ReportProps) {
  const rec = check.recommendation || "review";

  return (
    <Document>
      {/* Cover */}
      <Page size="A4" style={s.page}>
        <View style={{ alignItems: "center", marginTop: 120 }}>
          <Text style={{ fontSize: 12, color: "#979797", marginBottom: 20 }}>
            Ecclesia Gruppe
          </Text>
          <Text style={{ fontSize: 28, fontWeight: 700, color: "#2649A5" }}>
            Frachtführer-Prüfbericht
          </Text>
          <Text style={{ fontSize: 16, color: "#3B3B3B", marginTop: 12 }}>
            {check.carrierName}
          </Text>
          <Text style={{ fontSize: 11, color: "#979797", marginTop: 8 }}>
            {check.checkNumber} • {new Date(check.createdAt).toLocaleDateString("de-DE")}
          </Text>
          <View style={{ marginTop: 30 }}>
            <Text style={[s.badge, { backgroundColor: recColors[rec], fontSize: 14, padding: "6 16" }]}>
              {recLabels[rec]}
            </Text>
          </View>
        </View>
        <Text style={s.footer}>
          Automatisierte Vorprüfung — keine Rechtsberatung • Ecclesia Gruppe
        </Text>
      </Page>

      {/* Summary */}
      <Page size="A4" style={s.page}>
        <Text style={s.header}>Zusammenfassung</Text>

        <View style={s.row}>
          <View>
            <Text style={s.text}>Risikoscore: {check.riskScore}/100</Text>
            <Text style={s.text}>Vertrauensniveau: {check.confidenceLevel}%</Text>
            <Text style={s.text}>Empfehlung: {recLabels[rec]}</Text>
          </View>
        </View>

        <Text style={s.subheader}>Analysierte Dokumente ({documents.length})</Text>
        {documents.map((doc, i) => (
          <Text key={i} style={s.text}>
            • {doc.documentType} — {doc.fileName} (Konfidenz: {doc.confidence ? Math.round(doc.confidence * 100) : 0}%)
          </Text>
        ))}

        {/* Document details */}
        {documents.map((doc, i) => (
          <View key={i}>
            <Text style={s.subheader}>
              {doc.documentType} — {doc.fileName}
            </Text>

            {doc.extractedFields && Object.entries(doc.extractedFields).map(([key, val]) => (
              <View key={key} style={s.fieldRow}>
                <Text style={s.fieldLabel}>{key}</Text>
                <Text style={s.fieldValue}>
                  {typeof val === "object" ? JSON.stringify(val) : String(val || "—")}
                </Text>
              </View>
            ))}

            {doc.riskSignals && doc.riskSignals.length > 0 && (
              <View style={{ marginTop: 6 }}>
                {doc.riskSignals.map((sig, j) => (
                  <View key={j} style={s.signal}>
                    <Text style={[s.signalSeverity, {
                      color: sig.severity === "critical" ? "#E02E2A" : sig.severity === "major" ? "#F75880" : "#EF6C00",
                    }]}>
                      [{sig.severity.toUpperCase()}] {sig.rule} ({sig.points} Punkte)
                    </Text>
                    <Text style={{ fontSize: 9 }}>{sig.description}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Guidance */}
        <Text style={s.subheader}>Nächste Schritte</Text>
        <Text style={s.text}>• Versicherungsschutz telefonisch beim Versicherer bestätigen lassen</Text>
        <Text style={s.text}>• Festnetznummer des Unternehmens durch Rückruf prüfen</Text>
        <Text style={s.text}>• Personen- und Lieferdokumente bei Übergabe der Ware kontrollieren</Text>

        <Text style={s.disclaimer}>
          {check.checkNumber} • {new Date(check.createdAt).toISOString()} • Automatisierte Vorprüfung — keine Rechtsberatung
        </Text>
        <Text style={s.footer}>
          Ecclesia Gruppe • Frachtführer-Prüfung
        </Text>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Create PDF generation function**

Create `src/lib/pdf/generate.ts`:

```typescript
import { renderToBuffer } from "@react-pdf/renderer";
import { CarrierReport } from "./report";
import React from "react";

export async function generateReport(
  check: Parameters<typeof CarrierReport>[0]["check"],
  documents: Parameters<typeof CarrierReport>[0]["documents"]
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    React.createElement(CarrierReport, { check, documents })
  );
  return Buffer.from(buffer);
}
```

- [ ] **Step 3: Create report API route**

Create `src/app/api/report/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checks, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateReport } from "@/lib/pdf/generate";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const check = db.query.checks.findFirst({
    where: eq(checks.id, id),
  });

  if (!check) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const docs = db
    .select()
    .from(documents)
    .where(eq(documents.checkId, id))
    .all();

  const pdfBuffer = await generateReport(
    {
      checkNumber: check.checkNumber,
      carrierName: check.carrierName,
      riskScore: check.riskScore,
      confidenceLevel: check.confidenceLevel,
      recommendation: check.recommendation,
      createdAt: check.createdAt,
    },
    docs.map((d) => ({
      documentType: d.documentType,
      fileName: d.fileName,
      extractedFields: (d.extractedFields as Record<string, unknown>) || {},
      riskSignals: (d.riskSignals as any[]) || [],
      confidence: d.confidence,
    }))
  );

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${check.checkNumber}-${check.carrierName}.pdf"`,
    },
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Ecclesia-branded PDF report generation with download endpoint"
```

---

### Task 14: Feedback System

**Files:**
- Create: `src/app/api/feedback/route.ts`, `src/components/feedback/feedback-prompt.tsx`, `src/app/feedback/page.tsx`

- [ ] **Step 1: Create feedback API route**

Create `src/app/api/feedback/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";
import { desc } from "drizzle-orm";

export async function GET() {
  const items = db.select().from(feedback).orderBy(desc(feedback.createdAt)).all();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const item = {
    id: generateId(),
    checkId: body.checkId || null,
    category: body.category,
    comment: body.comment,
    page: body.page || null,
  };

  db.insert(feedback).values(item).run();
  return NextResponse.json({ item });
}
```

- [ ] **Step 2: Create feedback prompt component**

Create `src/components/feedback/feedback-prompt.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface FeedbackPromptProps {
  checkId: string;
}

const categories = [
  { id: "works_well", label: "Funktioniert gut", icon: "👍", color: "bg-ec-success/10 border-ec-success/20 text-ec-success" },
  { id: "needs_improvement", label: "Verbesserungsbedarf", icon: "💡", color: "bg-ec-yellow/15 border-ec-yellow/30 text-yellow-700" },
  { id: "does_not_work", label: "Funktioniert nicht", icon: "❌", color: "bg-ec-error/10 border-ec-error/20 text-ec-error" },
];

export function FeedbackPrompt({ checkId }: FeedbackPromptProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;

    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkId,
        category: selected,
        comment: comment || `${categories.find((c) => c.id === selected)?.label}`,
        page: "results",
      }),
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-ec-mint/30 bg-ec-mint/10 p-4 text-center">
        <p className="text-sm font-medium text-ec-dark-green">
          Vielen Dank für Ihr Feedback!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ec-medium-grey bg-white p-4">
      <p className="mb-3 text-sm font-medium text-ec-grey-80">
        Wie war diese Prüfung?
      </p>
      <div className="flex gap-2 mb-3">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelected(cat.id)}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              selected === cat.id
                ? cat.color
                : "border-ec-grey-60 text-ec-grey-70 hover:bg-ec-grey-40"
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>
      {selected && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optionaler Kommentar..."
            className="w-full rounded-lg border border-ec-grey-60 px-3 py-2 text-sm focus:border-ec-light-blue focus:outline-none"
            rows={2}
          />
          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={handleSubmit}>Absenden</Button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create feedback review page**

Create `src/app/feedback/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface FeedbackItem {
  id: string;
  checkId: string | null;
  category: string;
  comment: string;
  page: string | null;
  createdAt: string;
}

const catConfig: Record<string, { label: string; variant: "success" | "warning" | "critical" }> = {
  works_well: { label: "Funktioniert gut", variant: "success" },
  needs_improvement: { label: "Verbesserungsbedarf", variant: "warning" },
  does_not_work: { label: "Funktioniert nicht", variant: "critical" },
};

export default function FeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    fetch("/api/feedback")
      .then((r) => r.json())
      .then((data) => setItems(data.items));
  }, []);

  return (
    <div>
      <h1 className="mb-6 font-barlow text-3xl font-bold text-ec-dark-blue">
        Feedback
      </h1>

      {items.length === 0 ? (
        <Card>
          <p className="text-center text-ec-grey-70">Noch kein Feedback eingegangen.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const config = catConfig[item.category];
            return (
              <Card key={item.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant={config?.variant || "neutral"}>
                      {config?.label || item.category}
                    </Badge>
                    <p className="mt-2 text-sm text-ec-grey-80">{item.comment}</p>
                    {item.page && (
                      <p className="mt-1 text-xs text-ec-grey-70">Seite: {item.page}</p>
                    )}
                  </div>
                  <span className="text-xs text-ec-grey-70">
                    {new Date(item.createdAt).toLocaleDateString("de-DE")}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add "Feedback" link to navigation**

Update `src/components/layout/nav-links.tsx` to add a Feedback link:

```typescript
const links = [
  { href: "/", label: "Start" },
  { href: "/check", label: "Neue Prüfung" },
  { href: "/history", label: "Verlauf" },
  { href: "/backlog", label: "Backlog" },
  { href: "/feedback", label: "Feedback" },
];
```

- [ ] **Step 5: Add "Convert to Backlog" button on feedback items**

Update `src/app/feedback/page.tsx` — add a convert function and button to each feedback item:

```tsx
const convertToBacklog = async (item: FeedbackItem) => {
  await fetch("/api/backlog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create",
      title: `[Feedback] ${item.comment.substring(0, 60)}`,
      description: `Aus Feedback konvertiert (${catConfig[item.category]?.label}): ${item.comment}`,
      priority: item.category === "does_not_work" ? "high" : "medium",
    }),
  });
  alert("Als Backlog-Eintrag erstellt!");
};
```

Add a button in each feedback card's render:

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => convertToBacklog(item)}
>
  → Backlog
</Button>
```

- [ ] **Step 6: Add feedback prompt to results page**

Add import to `src/app/results/[id]/page.tsx`:

```tsx
import { FeedbackPrompt } from "@/components/feedback/feedback-prompt";
```

Add the feedback prompt before the chat button:

```tsx
{/* Feedback */}
<FeedbackPrompt checkId={id} />
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add feedback system with prompt, nav link, convert-to-backlog, and review page"
```

---

### Task 15: Final Integration & Smoke Test

**Files:**
- Modify: various small fixes

- [ ] **Step 1: Create uploads directory**

```bash
mkdir -p /Users/don/FakeCarrier/uploads
mkdir -p /Users/don/FakeCarrier/data
```

- [ ] **Step 2: Run the seed script to populate backlog**

```bash
cd /Users/don/FakeCarrier
npx tsx src/lib/db/seed.ts
```

Expected: "Seeded 15 backlog items."

- [ ] **Step 3: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 4: Smoke test all pages**

Navigate to each page and verify:
- http://localhost:3000 — Home page with Ecclesia branding, hero section, stats
- http://localhost:3000/check — Wizard with progress bar, carrier form, dropzone
- http://localhost:3000/history — History table (empty initially, shows "Noch keine Prüfungen")
- http://localhost:3000/backlog — Kanban board with 15 pre-seeded items
- http://localhost:3000/feedback — Feedback list (empty initially)

- [ ] **Step 5: Test full flow with a real document**

1. Go to /check
2. Enter carrier name: "Test Transport GmbH"
3. Upload a sample insurance certificate PDF
4. Click "Analyse starten"
5. Watch streaming progress
6. Verify redirect to results page
7. Check risk-confidence chart renders
8. Click "Chat mit Agent" and ask a question
9. Click "PDF Report herunterladen" and verify PDF downloads
10. Submit feedback
11. Check /history shows the completed check
12. Check /feedback shows the submitted feedback

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete MVP integration — all pages, analysis pipeline, and feedback working"
```
