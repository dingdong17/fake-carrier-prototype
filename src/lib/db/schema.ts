import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";

// ============================================================
// Auth / RBAC / tenancy
// ============================================================

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: text("email_verified"),
  name: text("name"),
  image: text("image"),
  role: text("role", { enum: ["admin", "broker", "client"] }).notNull(),
  clientId: text("client_id").references(() => clients.id),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  creditBalance: integer("credit_balance").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Auth.js Drizzle adapter tables — required by @auth/drizzle-adapter
// Reference: https://authjs.dev/getting-started/adapters/drizzle

export const accounts = sqliteTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
  })
);

export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  })
);

// ============================================================
// Existing domain tables — checks gains clientId + createdByUserId
// ============================================================

export const checks = sqliteTable("checks", {
  id: text("id").primaryKey(),
  checkNumber: text("check_number").notNull().unique(),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => users.id),
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
  testSet: text("test_set", {
    enum: ["quick", "medium", "full"],
  })
    .notNull()
    .default("medium"),
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
  category: text("category", {
    enum: [
      "ui",
      "ai_chat",
      "ai_analytics",
      "external_api",
      "client_credits",
      "security_rbac",
      "infrastructure",
    ],
  }),
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

export const analyticsEvents = sqliteTable("analytics_events", {
  id: text("id").primaryKey(),
  event: text("event").notNull(),
  checkId: text("check_id"),
  documentId: text("document_id"),
  durationMs: integer("duration_ms"),
  meta: text("meta"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ============================================================
// Type exports
// ============================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Check = typeof checks.$inferSelect;
export type NewCheck = typeof checks.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type BacklogItem = typeof backlogItems.$inferSelect;
export type NewBacklogItem = typeof backlogItems.$inferInsert;
export type BacklogCategory = NonNullable<
  typeof backlogItems.$inferSelect["category"]
>;
export type Feedback = typeof feedback.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
