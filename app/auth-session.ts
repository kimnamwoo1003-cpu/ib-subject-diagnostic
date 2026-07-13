import { eq, lt } from "drizzle-orm";
import { ensureSchema, getDb } from "../db";
import { sessions } from "../db/schema";
import { createSessionToken, hashSessionToken, SESSION_MAX_AGE, sessionCookie } from "./password-auth";

export async function startSession(username: string) {
  await ensureSchema();
  const db = await getDb();
  const token = createSessionToken();
  const tokenHash = await hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date().toISOString()));
  await db.insert(sessions).values({ tokenHash, username, expiresAt });
  return { token, cookie: sessionCookie(token) };
}

export async function endSession(token: string | null) {
  if (!token) return;
  await ensureSchema();
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.tokenHash, await hashSessionToken(token)));
}
