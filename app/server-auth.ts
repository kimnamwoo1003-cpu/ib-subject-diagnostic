import { and, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { ensureSchema, getDb } from "../db";
import { accounts, sessions } from "../db/schema";
import { hashSessionToken, SESSION_COOKIE } from "./password-auth";

export const ADMIN_USERNAME = "justinnamwoo1003";

export function isAdminUsername(username: string) {
  return username.trim().toLowerCase() === ADMIN_USERNAME;
}

export async function requireApiUser() {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie") ?? "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!token) return null;
  await ensureSchema();
  const db = await getDb();
  const tokenHash = await hashSessionToken(token);
  const [row] = await db.select({ username: accounts.username }).from(sessions)
    .innerJoin(accounts, eq(accounts.username, sessions.username))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date().toISOString()))).limit(1);
  if (!row) return null;
  return { email: row.username, displayName: row.username, fullName: row.username, isAdmin: isAdminUsername(row.username) };
}

export function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
