import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  email: text("email").primaryKey(),
  displayName: text("display_name").notNull(),
  premium: integer("premium", { mode: "boolean" }).notNull().default(false),
  selectedSubjects: text("selected_subjects").notNull().default("[]"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const testAttempts = sqliteTable("test_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  subjectId: text("subject_id").notNull(),
  subjectName: text("subject_name").notNull(),
  level: text("level").notNull(),
  paperId: text("paper_id").notNull(),
  paperName: text("paper_name").notNull(),
  mode: text("mode").notNull(),
  percent: integer("percent").notNull(),
  grade: integer("grade").notNull(),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  topicBreakdown: text("topic_breakdown").notNull().default("[]"),
  criteriaBreakdown: text("criteria_breakdown").notNull().default("[]"),
  questionIds: text("question_ids").notNull().default("[]"),
  difficultyTrail: text("difficulty_trail").notNull().default("[]"),
  mistakes: text("mistakes").notNull().default("[]"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
