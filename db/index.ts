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
    env.DB.prepare("CREATE INDEX IF NOT EXISTS attempts_user_date_idx ON test_attempts (user_email, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS premium_requests_user_date_idx ON premium_requests (user_email, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS premium_requests_status_idx ON premium_requests (status, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS sessions_username_idx ON sessions (username)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions (expires_at)"),
  ]);
  for (const statement of [
    "ALTER TABLE accounts ADD COLUMN recovery_hash text",
    "ALTER TABLE accounts ADD COLUMN recovery_salt text",
    "ALTER TABLE profiles ADD COLUMN subject_levels text DEFAULT '{}' NOT NULL",
    "ALTER TABLE test_attempts ADD COLUMN criteria_breakdown text DEFAULT '[]' NOT NULL",
    "ALTER TABLE test_attempts ADD COLUMN question_ids text DEFAULT '[]' NOT NULL",
    "ALTER TABLE test_attempts ADD COLUMN difficulty_trail text DEFAULT '[]' NOT NULL",
  ]) {
    try { await env.DB.prepare(statement).run(); } catch { /* column already exists */ }
  }
}
