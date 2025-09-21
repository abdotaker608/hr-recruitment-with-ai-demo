import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  department: text("department"),
  location: text("location"),
  jdText: text("jd_text").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch('now')*1000)`)
    .notNull(),
});

export const candidates = sqliteTable("candidates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  resumeText: text("resume_text"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch('now')*1000)`)
    .notNull(),
});

export const screenings = sqliteTable("screenings", {
  id: text("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .references(() => jobs.id),
  candidateId: text("candidate_id")
    .notNull()
    .references(() => candidates.id),
  mode: text("mode").notNull(), // 'voice' | 'text'
  startedAt: integer("started_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch('now')*1000)`)
    .notNull(),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }),
  fitScore: real("fit_score"),
  salaryExpectation: text("salary_expectation"),
  noticePeriod: text("notice_period"),
  reasonForLeaving: text("reason_for_leaving"),
  motivation: text("motivation"),
  careerExpectations: text("career_expectations"),
  summary: text("summary"),
  riskFlags: text("risk_flags"), // JSON array string
});

export const qaTurns = sqliteTable("qa_turns", {
  id: text("id").primaryKey(),
  screeningId: text("screening_id")
    .notNull()
    .references(() => screenings.id),
  role: text("role").notNull(), // 'assistant' | 'candidate' | 'system'
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch('now')*1000)`)
    .notNull(),
});

export const sparcItems = sqliteTable("sparc_items", {
  id: text("id").primaryKey(),
  screeningId: text("screening_id")
    .notNull()
    .references(() => screenings.id),
  anchorSnippet: text("anchor_snippet").notNull(),
  situation: text("situation"),
  problem: text("problem"),
  action: text("action"),
  result: text("result"),
  calibration: text("calibration"),
  score: real("score"),
});
