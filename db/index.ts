import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

async function getRuntimeEnv() {
  const runtime = await import("cloudflare:workers");
  return runtime.env;
}

export async function getDb() {
  const env = await getRuntimeEnv();
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

export async function ensureSchema() {
  const env = await getRuntimeEnv();
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS accounts (
      username text PRIMARY KEY NOT NULL,
      password_hash text NOT NULL,
      password_salt text NOT NULL,
      recovery_hash text,
      recovery_salt text,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash text PRIMARY KEY NOT NULL,
      username text NOT NULL,
      expires_at text NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS profiles (
      email text PRIMARY KEY NOT NULL,
      display_name text NOT NULL,
      premium integer DEFAULT 0 NOT NULL,
      selected_subjects text DEFAULT '[]' NOT NULL,
      subject_levels text DEFAULT '{}' NOT NULL,
      account_status text DEFAULT 'active' NOT NULL,
      suspended_until text,
      suspension_reason text DEFAULT '' NOT NULL,
      moderation_strikes integer DEFAULT 0 NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS test_attempts (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_email text NOT NULL,
      subject_id text NOT NULL,
      subject_name text NOT NULL,
      level text NOT NULL,
      paper_id text NOT NULL,
      paper_name text NOT NULL,
      mode text NOT NULL,
      percent integer NOT NULL,
      grade integer NOT NULL,
      duration_seconds integer DEFAULT 0 NOT NULL,
      topic_breakdown text DEFAULT '[]' NOT NULL,
      criteria_breakdown text DEFAULT '[]' NOT NULL,
      question_ids text DEFAULT '[]' NOT NULL,
      difficulty_trail text DEFAULT '[]' NOT NULL,
      mistakes text DEFAULT '[]' NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_activities (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_email text NOT NULL,
      action text NOT NULL,
      subject_id text,
      level text,
      paper_id text,
      detail text DEFAULT '{}' NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS premium_requests (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_email text NOT NULL,
      plan text DEFAULT 'premium_access' NOT NULL,
      amount_krw integer NOT NULL,
      payment_method text NOT NULL,
      payer_name text NOT NULL,
      payment_reference text NOT NULL,
      note text DEFAULT '' NOT NULL,
      status text DEFAULT 'pending' NOT NULL,
      admin_note text DEFAULT '' NOT NULL,
      reviewed_by text,
      reviewed_at text,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS grade_evidence (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_email text NOT NULL,
      subject_id text NOT NULL,
      level text NOT NULL,
      component_id text NOT NULL,
      component_name text NOT NULL,
      source_platform text NOT NULL,
      score_earned integer NOT NULL,
      score_possible integer NOT NULL,
      percent integer NOT NULL,
      assessment_weight integer NOT NULL,
      assessment_date text NOT NULL,
      evidence_key text NOT NULL,
      evidence_hash text NOT NULL,
      evidence_mime text NOT NULL,
      evidence_size integer NOT NULL,
      original_filename text NOT NULL,
      status text DEFAULT 'pending' NOT NULL,
      automated_checks text DEFAULT '[]' NOT NULL,
      admin_note text DEFAULT '' NOT NULL,
      reviewed_by text,
      reviewed_at text,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS grade_goals (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_email text NOT NULL,
      subject_id text NOT NULL,
      level text NOT NULL,
      target_percent integer DEFAULT 75 NOT NULL,
      grade7_boundary integer DEFAULT 75 NOT NULL,
      upcoming_component_id text DEFAULT 'p1' NOT NULL,
      upcoming_component_name text DEFAULT 'Paper 1' NOT NULL,
      upcoming_weight integer DEFAULT 20 NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS community_profiles (
      user_email text PRIMARY KEY NOT NULL,
      bio text DEFAULT '' NOT NULL,
      school text DEFAULT '' NOT NULL,
      graduation_year integer,
      avatar_color text DEFAULT 'indigo' NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS community_posts (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      author_email text NOT NULL,
      title text NOT NULL,
      body text NOT NULL,
      category text NOT NULL,
      tags text DEFAULT '[]' NOT NULL,
      status text DEFAULT 'visible' NOT NULL,
      moderation_state text DEFAULT 'clean' NOT NULL,
      moderation_signals text DEFAULT '[]' NOT NULL,
      pinned integer DEFAULT 0 NOT NULL,
      locked integer DEFAULT 0 NOT NULL,
      view_count integer DEFAULT 0 NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS community_comments (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      post_id integer NOT NULL,
      author_email text NOT NULL,
      parent_id integer,
      body text NOT NULL,
      status text DEFAULT 'visible' NOT NULL,
      moderation_state text DEFAULT 'clean' NOT NULL,
      moderation_signals text DEFAULT '[]' NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS community_reactions (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_email text NOT NULL,
      target_type text NOT NULL,
      target_id integer NOT NULL,
      reaction_type text DEFAULT 'like' NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS community_bookmarks (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_email text NOT NULL,
      post_id integer NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS community_follows (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      follower_email text NOT NULL,
      following_email text NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS community_reports (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      reporter_email text NOT NULL,
      target_type text NOT NULL,
      target_id integer NOT NULL,
      reason text NOT NULL,
      detail text DEFAULT '' NOT NULL,
      status text DEFAULT 'pending' NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS moderation_cases (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      source text NOT NULL,
      target_type text NOT NULL,
      target_id integer NOT NULL,
      target_author text NOT NULL,
      reason text NOT NULL,
      severity text NOT NULL,
      signals text DEFAULT '[]' NOT NULL,
      status text DEFAULT 'pending' NOT NULL,
      reported_by text,
      reviewed_by text,
      reviewed_at text,
      admin_note text DEFAULT '' NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS community_notifications (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_email text NOT NULL,
      type text NOT NULL,
      actor_email text,
      post_id integer,
      comment_id integer,
      message text NOT NULL,
      read integer DEFAULT 0 NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS attempts_user_date_idx ON test_attempts (user_email, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS premium_requests_user_date_idx ON premium_requests (user_email, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS activities_user_date_idx ON user_activities (user_email, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS premium_requests_status_idx ON premium_requests (status, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS sessions_username_idx ON sessions (username)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions (expires_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS grade_evidence_user_date_idx ON grade_evidence (user_email, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS grade_evidence_status_date_idx ON grade_evidence (status, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS grade_evidence_hash_idx ON grade_evidence (evidence_hash)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS grade_goals_user_subject_level_idx ON grade_goals (user_email, subject_id, level)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS community_posts_status_date_idx ON community_posts (status, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS community_posts_author_date_idx ON community_posts (author_email, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS community_posts_category_date_idx ON community_posts (category, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS community_comments_post_date_idx ON community_comments (post_id, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS community_comments_author_date_idx ON community_comments (author_email, created_at)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS community_reactions_unique_idx ON community_reactions (user_email, target_type, target_id, reaction_type)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS community_reactions_target_idx ON community_reactions (target_type, target_id)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS community_bookmarks_unique_idx ON community_bookmarks (user_email, post_id)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS community_follows_unique_idx ON community_follows (follower_email, following_email)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS community_reports_unique_idx ON community_reports (reporter_email, target_type, target_id)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS community_reports_status_date_idx ON community_reports (status, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS moderation_cases_status_date_idx ON moderation_cases (status, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS moderation_cases_author_date_idx ON moderation_cases (target_author, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS community_notifications_user_date_idx ON community_notifications (user_email, created_at)"),
  ]);
  for (const statement of [
    "ALTER TABLE accounts ADD COLUMN recovery_hash text",
    "ALTER TABLE accounts ADD COLUMN recovery_salt text",
    "ALTER TABLE profiles ADD COLUMN subject_levels text DEFAULT '{}' NOT NULL",
    "ALTER TABLE profiles ADD COLUMN account_status text DEFAULT 'active' NOT NULL",
    "ALTER TABLE profiles ADD COLUMN suspended_until text",
    "ALTER TABLE profiles ADD COLUMN suspension_reason text DEFAULT '' NOT NULL",
    "ALTER TABLE profiles ADD COLUMN moderation_strikes integer DEFAULT 0 NOT NULL",
    "ALTER TABLE test_attempts ADD COLUMN criteria_breakdown text DEFAULT '[]' NOT NULL",
    "ALTER TABLE test_attempts ADD COLUMN question_ids text DEFAULT '[]' NOT NULL",
    "ALTER TABLE test_attempts ADD COLUMN difficulty_trail text DEFAULT '[]' NOT NULL",
  ]) {
    try { await env.DB.prepare(statement).run(); } catch { /* column already exists */ }
  }
}
