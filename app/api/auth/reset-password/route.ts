import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { accounts, sessions } from "../../../../db/schema";
import { createPasswordRecord, normalizeRecoveryCode, normalizeUsername, validatePassword, validateRecoveryCode, validateUsername, verifyPassword } from "../../../password-auth";
import { apiJson, apiOptions } from "../../../api-response";

export const OPTIONS = apiOptions;

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { username?: string; recoveryCode?: string; newPassword?: string };
    const username = normalizeUsername(payload.username ?? "");
    const recoveryCode = normalizeRecoveryCode(payload.recoveryCode ?? "");
    const newPassword = payload.newPassword ?? "";
    const validationError = validateUsername(username) ?? validateRecoveryCode(recoveryCode) ?? validatePassword(newPassword);
    if (validationError) return apiJson(request, { error: validationError }, { status: 400 });

    await ensureSchema();
    const db = await getDb();
    const [account] = await db.select().from(accounts).where(eq(accounts.username, username)).limit(1);
    const { env } = await import("cloudflare:workers");
    const pepper = String(env.AUTH_PEPPER ?? "");
    const valid = Boolean(account?.recoveryHash && account.recoverySalt && await verifyPassword(recoveryCode, account.recoverySalt, account.recoveryHash, pepper));
    if (!valid) return apiJson(request, { error: "The username or recovery code is incorrect." }, { status: 401 });

    const passwordRecord = await createPasswordRecord(newPassword, pepper);
    await db.update(accounts).set({ ...passwordRecord }).where(eq(accounts.username, username));
    await db.delete(sessions).where(eq(sessions.username, username));
    return apiJson(request, { ok: true, message: "Password reset complete. Log in with your new password." });
  } catch (error) {
    console.error("Password reset failed", error);
    return apiJson(request, { error: "Could not reset the password. Please try again." }, { status: 500 });
  }
}
