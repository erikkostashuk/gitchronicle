import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  fullName: text("full_name"),
  sourceType: text("source_type", {
    enum: ["demo", "github", "local"],
  }).notNull(),
  sourceUrl: text("source_url"),
  localPath: text("local_path"),
  description: text("description"),
  status: text("status", {
    enum: ["pending", "cloning", "analyzing", "ready", "failed"],
  })
    .notNull()
    .default("pending"),
  errorMessage: text("error_message"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const analyses = sqliteTable("analyses", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  summaryJson: text("summary_json").notNull(),
  resultJson: text("result_json").notNull(),
  commitCount: integer("commit_count").notNull().default(0),
  contributorCount: integer("contributor_count").notNull().default(0),
  fileCount: integer("file_count").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["clone_and_analyze", "analyze_local", "reanalyze"],
  }).notNull(),
  status: text("status", {
    enum: ["pending", "running", "completed", "failed"],
  })
    .notNull()
    .default("pending"),
  progress: integer("progress").notNull().default(0),
  stage: text("stage").notNull().default("queued"),
  errorMessage: text("error_message"),
  payloadJson: text("payload_json"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  startedAt: text("started_at"),
  finishedAt: text("finished_at"),
});

export type Project = typeof projects.$inferSelect;
export type Analysis = typeof analyses.$inferSelect;
export type Job = typeof jobs.$inferSelect;
