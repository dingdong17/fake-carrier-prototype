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
