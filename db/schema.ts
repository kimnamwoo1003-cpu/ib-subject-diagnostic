import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  username: text("username").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  recoveryHash: text("recovery_hash"),
  recoverySalt: text("recovery_salt"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  username: text("username").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const profiles = sqliteTable("profiles", {
  email: text("email").primaryKey(),
  displayName: text("display_name").notNull(),
  premium: integer("premium", { mode: "boolean" }).notNull().default(false),
  selectedSubjects: text("selected_subjects").notNull().default("[]"),
  subjectLevels: text("subject_levels").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const premiumRequests = sqliteTable("premium_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  plan: text("plan").notNull().default("premium_access"),
  amountKrw: integer("amount_krw").notNull(),
  paymentMethod: text("payment_method").notNull(),
  payerName: text("payer_name").notNull(),
  paymentReference: text("payment_reference").notNull(),
  note: text("note").notNull().default(""),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note").notNull().default(""),
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
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

export const userActivities = sqliteTable("user_activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  action: text("action").notNull(),
  subjectId: text("subject_id"),
  level: text("level"),
  paperId: text("paper_id"),
  detail: text("detail").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const gradeEvidence = sqliteTable("grade_evidence", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  subjectId: text("subject_id").notNull(),
  level: text("level").notNull(),
  componentId: text("component_id").notNull(),
  componentName: text("component_name").notNull(),
  sourcePlatform: text("source_platform").notNull(),
  scoreEarned: integer("score_earned").notNull(),
  scorePossible: integer("score_possible").notNull(),
  percent: integer("percent").notNull(),
  assessmentWeight: integer("assessment_weight").notNull(),
  assessmentDate: text("assessment_date").notNull(),
  evidenceKey: text("evidence_key").notNull(),
  evidenceHash: text("evidence_hash").notNull(),
  evidenceMime: text("evidence_mime").notNull(),
  evidenceSize: integer("evidence_size").notNull(),
  originalFilename: text("original_filename").notNull(),
  status: text("status").notNull().default("pending"),
  automatedChecks: text("automated_checks").notNull().default("[]"),
  adminNote: text("admin_note").notNull().default(""),
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("grade_evidence_user_date_idx").on(table.userEmail, table.createdAt),
  index("grade_evidence_status_date_idx").on(table.status, table.createdAt),
  index("grade_evidence_hash_idx").on(table.evidenceHash),
]);

export const gradeGoals = sqliteTable("grade_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  subjectId: text("subject_id").notNull(),
  level: text("level").notNull(),
  targetPercent: integer("target_percent").notNull().default(75),
  grade7Boundary: integer("grade7_boundary").notNull().default(75),
  upcomingComponentId: text("upcoming_component_id").notNull().default("p1"),
  upcomingComponentName: text("upcoming_component_name").notNull().default("Paper 1"),
  upcomingWeight: integer("upcoming_weight").notNull().default(20),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("grade_goals_user_subject_level_idx").on(table.userEmail, table.subjectId, table.level),
]);
