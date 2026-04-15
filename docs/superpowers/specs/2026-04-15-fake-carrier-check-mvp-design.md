# FakeCarrier Check MVP — Design Specification

**Date:** 2026-04-15
**Status:** Approved
**Brand:** Ecclesia Gruppe

## 1. Purpose & Problem

Phantom freight carriers ("Phantomfrachtführer") are a growing organized crime problem in European logistics. Criminals use stolen identities, forged documents, freemail addresses, and spoofed phone numbers to pose as legitimate carriers on freight exchanges. When goods are handed over, they disappear.

German law (HGB §§407, 425, 428, 435) holds the forwarding agent/carrier liable — with **unlimited liability** — even when they themselves are victims of the fraud. Insurers can reduce or deny claims (0-100% reduction per OLG Düsseldorf, 18 U 212/22) if the policyholder didn't fulfill their "Obliegenheit" (obligation) to carefully vet subcontractors.

This application allows logistics companies to run AI-powered checks on freight carriers before contracting with them, producing an audit trail that proves due diligence compliance to insurers.

## 2. MVP Scope

### In Scope
- Document-based AI analysis of carrier documents using Claude
- Web UI with wizard-to-dashboard flow + optional chat mode
- Two-axis risk/confidence scoring model
- Branded PDF report generation (Ecclesia Gruppe)
- Check history
- Internal backlog kanban board
- Configurable document type registry
- Guidance layer: what AI checked, what human must do, what's outside scope

### Out of Scope (future phases)
- External registry API lookups (VIES, KREPTD, KRS, ARR, RPSD, etc.)
- User authentication (MS Entra Azure planned)
- Multi-tenant client access / billing
- TIMOCOM API integration
- Blacklist databases

## 3. Users & Access

**MVP users:** Internal SCHUNCK/Ecclesia team only. No authentication required.

**Rollout path:**
1. Internal testing (MVP)
2. Broker runs checks for clients
3. Clients access directly (requires auth, billing)

## 4. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + TypeScript + React |
| AI | Claude API (Anthropic SDK) with streaming |
| ORM | Drizzle ORM |
| Database | SQLite (local MVP) → Turso (Vercel deployment) |
| PDF | @react-pdf/renderer |
| Styling | Tailwind CSS with Ecclesia design tokens |
| Hosting (future) | Vercel |
| Auth (future) | MS Entra Azure |
| File storage (future) | Vercel Turso or Azure data persistence |

## 5. Application Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Next.js App                       │
│                                                     │
│  Pages              API Routes        Lib/Core      │
│  ─────              ──────────        ────────      │
│  / (home)           /api/analyze      analysis/     │
│  /check             /api/chat           ├ pipeline  │
│  /results/[id]      /api/report         ├ scoring   │
│  /history           /api/upload         └ prompts   │
│  /backlog                             db/           │
│                                         ├ schema    │
│                                         └ drizzle   │
│                                       pdf/          │
│                                         └ generator │
│                                       config/       │
│                                         └ documents │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │       SQLite (local) → Turso (later)         │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

Concurrent users are handled naturally — each Claude API call is independent, and Next.js handles parallel requests out of the box.

## 6. Pages & User Flow

### 6.1 Home (`/`)

- Ecclesia-branded landing with app purpose
- Primary CTA: "Neue Prüfung starten"
- Quick stats: total checks run, recent checks list
- Navigation to History and Backlog

### 6.2 New Check Wizard (`/check`)

**Step 1 — Upload & Carrier Info:**
- Large dropzone for bulk file upload (PDF, images, scans)
- Carrier name field (required before analysis completes, but user can upload first)
- Optional fields: Country, VAT ID, known contact info
- AI auto-classifies uploaded documents by type
- AI can pre-fill carrier info fields from documents

**Step 2 — Progressive Analysis:**
- Live view as Claude processes each document sequentially via streaming
- Results appear document by document
- Inline follow-up prompts when AI needs clarification (e.g. "Die Versicherungsbestätigung enthält keine Policennummer. Können Sie eine vollständigere Version hochladen?")
- User can respond, upload additional docs, or skip
- Progress indicator per document

**Step 3 — Results Redirect:**
- Auto-redirects to `/results/[id]` when analysis completes

### 6.3 Results Dashboard (`/results/[id]`)

**Header:** Carrier name, check number (FC-xxx), date/time, overall assessment.

**Risk-Confidence Matrix:** Gradient diagonal chart with carrier position plotted. Zones: FREIGEBEN (safe), PRÜFEN (review), WARNUNG (warning), ABLEHNEN (reject).

**Recommendation Banner:** Color-coded with one-paragraph explanation.

**Document Cards:** Expandable card per analyzed document:
- Extracted fields table
- Red flags with severity badges (Critical/Major/Minor)
- Document-level risk score and confidence
- Cross-document consistency notes

**Missing Documents Section:** What wasn't provided and impact on confidence.

**Nächste Schritte (Next Steps):** AI-generated list of concrete human actions still required, based on analysis results. E.g.:
- "Rufen Sie den Versicherer an, um die Police mündlich bestätigen zu lassen"
- "Prüfen Sie die Festnetznummer durch einen Rückruf"

**Guidance Layer — Three-Tier Clarity Model:**

| Category | Label (DE) | Meaning |
|----------|-----------|---------|
| AI-verified | "Automatisch geprüft" | AI has verified (document fields, cross-checks) |
| Human action required | "Ihre Aktion erforderlich" | Human must do this (call insurer, verify physical docs, confirm driver at handover) |
| Outside scope | "Außerhalb der Prüfmöglichkeit" | Cannot be verified in this tool (solvency, real-time tracking, criminal background) |

**"Chat mit Agent" Button:** Opens side panel for conversational follow-up.

**"PDF Report herunterladen" Button:** Generates branded Ecclesia PDF.

### 6.4 History (`/history`)

- Table of all past checks
- Columns: check number, carrier name, date, risk level, confidence, recommendation
- Filter by risk level, date range
- Click to re-open results

### 6.5 Backlog (`/backlog`)

- Kanban board: Backlog → In Progress → Done
- Cards: auto-numbered (BL-001, BL-002, ...), title, description, priority badge
- Priority levels: Critical, High, Medium, Low (Ecclesia brand colors)
- Drag-and-drop between columns
- Quick-add form
- Filter by priority

## 7. Analysis Pipeline

```
Upload → Classify → Extract → Validate → Cross-Check → Score
```

### 7.1 Classify
Claude vision identifies document type from uploaded file. Maps to configurable document type registry.

### 7.2 Extract
Per document type, Claude extracts structured fields defined in config. Output: JSON with field values + confidence per field (0-1).

### 7.3 Validate
Rule-based checks per field:
- Required fields present?
- Values plausible? (coverage period not expired, IBAN country matches company country)
- Format consistent? (professional layout, no obvious edits)

### 7.4 Cross-Check
Compare extracted data across all documents:
- Company name consistent?
- Addresses match?
- Domains match email addresses?
- Dates align?
- Repeated typos/patterns across documents?

### 7.5 Score
Compute both axes (see Section 8).

## 8. Scoring Model

### 8.1 Risk Score (0-100)

Goes UP with red flags found.

| Severity | Points | Examples |
|----------|--------|----------|
| Critical | 30-50 | Address mismatch across 2+ docs, generic insurance cert, domain spoofing + typos |
| Major | 15-25 | Freemail + mobile only, very fresh license (<3 months), implausible IBAN country |
| Minor | 5-10 | Minor typos, unclear formatting, single missing optional field |

**Thresholds:**
- 0-25: Low risk
- 26-55: Medium risk
- 56+: High risk

### 8.2 Confidence Level (0-100%)

Goes UP with more and better documents.

| Document Type | Weight | Notes |
|---------------|--------|-------|
| Versicherungsnachweis (mandatory) | 25% | Base confidence floor |
| EU-Transportlizenz | 20% | Strong identity signal |
| Briefkopf/Unternehmensdaten | 15% | Business identity |
| Frachtenbörsen-Profil | 15% | Track record |
| Kommunikation/Emails | 10% | Behavioral signal |
| Fahrer- & Fahrzeugdaten | 15% | Operational verification |

Weights are configurable. Within each document, confidence is also affected by extraction quality (clear scan vs. blurry photo, complete vs. partial data).

### 8.3 Combined Assessment (Gradient Diagonal)

Visualization: gradient diagonal chart from safe (bottom-right: low risk, high confidence) to dangerous (top-left: high risk, low confidence).

| Zone | Condition | German Label | Recommendation |
|------|-----------|-------------|----------------|
| Safe | Low risk + High confidence | FREIGEBEN | Approve carrier |
| Review | Low risk + Low confidence OR Medium risk + any | PRÜFEN | Manual review needed |
| Warning | High risk + Low confidence | WARNUNG | Likely reject, get more docs |
| Danger | High risk + High confidence | ABLEHNEN | Reject carrier |

## 9. Document Type Configuration

Stored as TypeScript config, editable without code changes to the pipeline:

```typescript
// /lib/config/document-types.ts
{
  "insurance-cert": {
    labelDe: "Versicherungsnachweis",
    required: true,
    confidenceWeight: 0.25,
    requiredFields: ["insurer", "policyNumber", "coveragePeriod",
                     "coverageAmount", "insuredCompany", "contactInfo"],
    redFlagRules: ["generic-form", "missing-logo", "expired-period",
                   "company-name-mismatch", "short-coverage-period"]
  },
  "transport-license": {
    labelDe: "EU-Transportlizenz",
    required: false,
    confidenceWeight: 0.20,
    requiredFields: ["licenseNumber", "authority", "validityPeriod",
                     "companyName", "companyAddress"],
    redFlagRules: ["fresh-license", "wrong-authority", "address-mismatch"]
  },
  // ... additional types
}
```

Adding a new document type = adding an entry with label, fields, rules, and weight.

## 10. Prompt Architecture

```
/lib/analysis/prompts/
  ├── system.ts            Base system prompt with agent behavior rules
  ├── insurance-cert.ts    Versicherungsnachweis analysis
  ├── transport-license.ts EU-Transportlizenz analysis
  ├── letterhead.ts        Briefkopf/Unternehmensdaten analysis
  ├── freight-profile.ts   Frachtenbörsen-Profil analysis
  ├── communication.ts     Email/communication analysis
  ├── driver-vehicle.ts    Fahrer- & Fahrzeugdaten analysis
  ├── cross-check.ts       Cross-document consistency check
  └── chat.ts              Follow-up conversation context
```

Each prompt includes: fields to extract, red flag rules (sourced from the harmonized checklist across SCHUNCK, ATRALO, SVG, KRAVAG, Zufall), scoring guidance, and structured JSON output format.

## 11. Chat Mode

### Access
"Chat mit Agent" button on results dashboard opens a side panel.

### Context
The chat AI has full context: all uploaded documents, extracted data, risk signals, scores, and the three-tier guidance model.

### Capabilities
- Answer questions about findings and explain specific red flags
- Proactively guide the user through remaining manual steps
- Accept additional documents mid-conversation (drag-and-drop into chat)
- Re-score after new information (updates dashboard live)
- Suggest concrete next steps with clear distinction of what AI checked vs. what human must do
- Surface limitations: what cannot be verified within the tool

### Guidance Integration
The chat agent enforces the three-tier clarity model in every response:
- States what it verified ("Automatisch geprüft")
- States what the user must still do ("Ihre Aktion erforderlich")
- States what's outside scope ("Außerhalb der Prüfmöglichkeit")

### Technical
- Claude API with streaming responses
- Context: system prompt + check data + all extractions + conversation history
- Chat history stored in `chat_messages` table per check
- New document uploads during chat trigger incremental re-analysis

## 12. PDF Report

### Structure

**Page 1 — Cover:**
- Ecclesia Gruppe logo
- "Frachtführer-Prüfbericht"
- Carrier name, check number (FC-xxx), date/time
- Overall recommendation badge

**Page 2 — Executive Summary:**
- Risk-Confidence Matrix graphic
- Risk Score: XX/100, Confidence Level: XX%
- Recommendation with explanation
- Documents provided vs. not provided

**Page 3+ — Document Analysis Details:**
- One section per analyzed document
- Extracted fields, red flags (severity + rule + explanation)
- Document-level scores
- Cross-document consistency section

**Page N-1 — Nächste Schritte & Guidance:**
- Three-tier breakdown (AI-verified / Human action / Outside scope)
- Concrete next steps for the user
- Missing documents and their impact on confidence

**Page N — Audit Footer:**
- Timestamp (ISO 8601)
- Analysis version / model identifier
- Disclaimer: "Automatisierte Vorprüfung — keine Rechtsberatung"
- Check ID for traceability

### Generation
Server-side using `@react-pdf/renderer`. Ecclesia brand: Dark Blue (#2649A5), Barlow headlines, Inter body, Mint (#75E7BC) accents.

## 13. Data Model

### checks
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| checkNumber | string | Auto: "FC-001", "FC-002", ... |
| carrierName | string | Required |
| carrierCountry | string | Optional |
| carrierVatId | string | Optional |
| carrierContact | JSON | Optional extra fields |
| riskScore | number | 0-100 |
| confidenceLevel | number | 0-100 |
| recommendation | enum | approve, review, warning, reject |
| status | enum | draft, analyzing, follow_up, completed |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### documents
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| checkId | FK | → checks |
| documentType | string | From config registry |
| fileName | string | Original filename |
| filePath | string | Local storage path |
| mimeType | string | |
| extractedFields | JSON | Structured data per doc type |
| riskSignals | JSON | Array of {severity, rule, description, field} |
| documentScore | number | 0-100 risk for this doc |
| confidence | number | 0-100 extraction quality |
| status | enum | uploaded, analyzing, analyzed, error |
| createdAt | timestamp | |

### chat_messages
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| checkId | FK | → checks |
| role | enum | user, assistant, system |
| content | text | |
| metadata | JSON | Referenced document, triggered action |
| createdAt | timestamp | |

### backlog_items
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| itemNumber | string | Auto: "BL-001", "BL-002", ... |
| title | string | |
| description | text | Optional |
| priority | enum | critical, high, medium, low |
| status | enum | backlog, in_progress, done |
| sortOrder | number | For drag-and-drop ordering |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### File Storage
MVP: local filesystem under `/uploads/[checkId]/[documentId].[ext]`.
Later: swap to Vercel Turso or Azure data persistence.

## 14. Brand & Styling

**Brand:** Ecclesia Gruppe

| Token | Value | Usage |
|-------|-------|-------|
| `--ec-primary-dark-blue` | #2649A5 | Primary actions, headers, navigation |
| `--ec-primary-light-blue` | #0050D2 | Links, interactive elements |
| `--ec-primary-mint` | #75E7BC | Accent, success-adjacent highlights |
| `--ec-red` | #F75880 | Critical risk badges, alerts |
| `--ec-yellow` | #FFCF31 | Warning badges |
| `--ec-dark-green` | #005E47 | Success/approve states |
| `--ec-light-green` | #7BCA65 | Positive feedback |

**Typography:** Barlow (headlines), Inter (body/UI). **Grid:** 12-column, max 1304px.

**UI language:** German. **Codebase language:** English.

## 15. Configurable Elements

The following are configurable without code changes to the core pipeline:

- Document types (add/remove/modify via config file)
- Required vs. optional documents
- Confidence weights per document type
- Red flag rules and point values per severity
- Risk thresholds (low/medium/high boundaries)
- Extracted field definitions per document type

## 16. Constraints & Limitations

- **No external API calls** in MVP — all analysis is document-based via Claude
- **No authentication** — internal use only
- **No legal advice** — disclaimer on every report
- **No real-time verification** — cannot call insurers, check live registries
- **Document language** — Claude handles multilingual analysis (DE, PL, RO, CZ, SK, EN, etc.) but UI is German only
- **File size** — practical limit based on Claude's context window for vision inputs
