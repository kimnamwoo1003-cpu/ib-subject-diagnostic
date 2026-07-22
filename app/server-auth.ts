import { and, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { ensureSchema, getDb } from "../db";
import { accounts, profiles, sessions } from "../db/schema";
import { activeSanction } from "./account-status";
import { hashSessionToken, SESSION_COOKIE } from "./password-auth";

export const ADMIN_USERNAME = "justinnamwoo1003";

export function isAdminUsername(username: string) {
  return username.trim().toLowerCase() === ADMIN_USERNAME;
}

export async function requireApiUser(options: { allowSuspended?: boolean } = {}) {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie") ?? "";
  const bearer = requestHeaders.get("authorization")?.match(/^Bearer\s+([a-f0-9]{64})$/i)?.[1];
  const token = bearer ?? cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!token) return null;
  await ensureSchema();
  const db = await getDb();
  const tokenHash = await hashSessionToken(token);
  const [row] = await db.select({ username: accounts.username }).from(sessions)
    .innerJoin(accounts, eq(accounts.username, sessions.username))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date().toISOString()))).limit(1);
  if (!row) return null;
  const isAdmin = isAdminUsername(row.username);
  const [profile] = await db.select({ accountStatus: profiles.accountStatus, suspendedUntil: profiles.suspendedUntil, suspensionReason: profiles.suspensionReason }).from(profiles).where(eq(profiles.email, row.username)).limit(1);
  const sanction = isAdmin ? null : activeSanction(profile);
  if (sanction && !options.allowSuspended) return null;
  return { email: row.username, displayName: row.username, fullName: row.username, isAdmin, sanction };
}

export function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
