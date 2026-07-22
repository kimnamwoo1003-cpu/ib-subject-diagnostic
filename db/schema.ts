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
  accountStatus: text("account_status").notNull().default("active"),
  suspendedUntil: text("suspended_until"),
  suspensionReason: text("suspension_reason").notNull().default(""),
  moderationStrikes: integer("moderation_strikes").notNull().default(0),
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

export const communityProfiles = sqliteTable("community_profiles", {
  userEmail: text("user_email").primaryKey(),
  nickname: text("nickname").notNull().default(""),
  bio: text("bio").notNull().default(""),
  school: text("school").notNull().default(""),
  graduationYear: integer("graduation_year"),
  avatarColor: text("avatar_color").notNull().default("indigo"),
  avatarKey: text("avatar_key"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityPosts = sqliteTable("community_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  authorEmail: text("author_email").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull(),
  tags: text("tags").notNull().default("[]"),
  status: text("status").notNull().default("visible"),
  moderationState: text("moderation_state").notNull().default("clean"),
  moderationSignals: text("moderation_signals").notNull().default("[]"),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("community_posts_status_date_idx").on(table.status, table.createdAt),
  index("community_posts_author_date_idx").on(table.authorEmail, table.createdAt),
  index("community_posts_category_date_idx").on(table.category, table.createdAt),
]);

export const communityComments = sqliteTable("community_comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id").notNull(),
  authorEmail: text("author_email").notNull(),
  parentId: integer("parent_id"),
  body: text("body").notNull(),
  status: text("status").notNull().default("visible"),
  moderationState: text("moderation_state").notNull().default("clean"),
  moderationSignals: text("moderation_signals").notNull().default("[]"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("community_comments_post_date_idx").on(table.postId, table.createdAt),
  index("community_comments_author_date_idx").on(table.authorEmail, table.createdAt),
]);

export const communityReactions = sqliteTable("community_reactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  reactionType: text("reaction_type").notNull().default("like"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("community_reactions_unique_idx").on(table.userEmail, table.targetType, table.targetId, table.reactionType),
  index("community_reactions_target_idx").on(table.targetType, table.targetId),
]);

export const communityBookmarks = sqliteTable("community_bookmarks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  postId: integer("post_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("community_bookmarks_unique_idx").on(table.userEmail, table.postId),
]);

export const communityFollows = sqliteTable("community_follows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  followerEmail: text("follower_email").notNull(),
  followingEmail: text("following_email").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("community_follows_unique_idx").on(table.followerEmail, table.followingEmail),
]);

export const communityReports = sqliteTable("community_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reporterEmail: text("reporter_email").notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  reason: text("reason").notNull(),
  detail: text("detail").notNull().default(""),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("community_reports_unique_idx").on(table.reporterEmail, table.targetType, table.targetId),
  index("community_reports_status_date_idx").on(table.status, table.createdAt),
]);

export const moderationCases = sqliteTable("moderation_cases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  targetAuthor: text("target_author").notNull(),
  reason: text("reason").notNull(),
  severity: text("severity").notNull(),
  signals: text("signals").notNull().default("[]"),
  status: text("status").notNull().default("pending"),
  reportedBy: text("reported_by"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  adminNote: text("admin_note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("moderation_cases_status_date_idx").on(table.status, table.createdAt),
  index("moderation_cases_author_date_idx").on(table.targetAuthor, table.createdAt),
]);

export const communityNotifications = sqliteTable("community_notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  type: text("type").notNull(),
  actorEmail: text("actor_email"),
  postId: integer("post_id"),
  commentId: integer("comment_id"),
  message: text("message").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("community_notifications_user_date_idx").on(table.userEmail, table.createdAt),
]);
