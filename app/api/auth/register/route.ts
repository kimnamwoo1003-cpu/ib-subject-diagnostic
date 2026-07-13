import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { accounts, profiles } from "../../../../db/schema";
import { startSession } from "../../../auth-session";
import { createPasswordRecord, createRecoveryCode, normalizeRecoveryCode, normalizeUsername, validatePassword, validateUsername } from "../../../password-auth";
import { ADMIN_USERNAME } from "../../../server-auth";
import { apiJson, apiOptions } from "../../../api-response";

export const OPTIONS = apiOptions;

export async function POST(request: Request) {
  let stage = "request validation";
  try {
    const payload = await request.json() as { username?: string; password?: string; adminCode?: string };
    const username = normalizeUsername(payload.username ?? "");
    const password = payload.password ?? "";
    const validationError = validateUsername(username) ?? validatePassword(password);
    if (validationError) return apiJson(request, { error: validationError }, { status: 400 });
    if (username === ADMIN_USERNAME) {
      const { env } = await import("cloudflare:workers");
      const expectedCode = String(env.ADMIN_SETUP_CODE ?? "");
      if (!expectedCode || payload.adminCode !== expectedCode) {
        return apiJson(request, { error: "The correct one-time setup code is required to create the administrator account." }, { status: 403 });
      }
    }

    stage = "account storage setup";
    await ensureSchema();
    const db = await getDb();
    stage = "username availability check";
    const [existing] = await db.select({ username: accounts.username }).from(accounts).where(eq(accounts.username, username)).limit(1);
    if (existing) return apiJson(request, { code: "username_taken", error: "This username is already in use." }, { status: 409 });

    stage = "password protection";
    const { env } = await import("cloudflare:workers");
    const passwordRecord = await createPasswordRecord(password, String(env.AUTH_PEPPER ?? ""));
    const recoveryCode = createRecoveryCode();
    const recoveryRecord = await createPasswordRecord(normalizeRecoveryCode(recoveryCode), String(env.AUTH_PEPPER ?? ""));
    stage = "account creation";
    try {
      await db.insert(accounts).values({ username, ...passwordRecord, recoveryHash: recoveryRecord.passwordHash, recoverySalt: recoveryRecord.passwordSalt });
    } catch {
      const [conflict] = await db.select({ username: accounts.username }).from(accounts).where(eq(accounts.username, username)).limit(1);
      if (conflict) return apiJson(request, { code: "username_taken", error: "This username is already in use." }, { status: 409 });
      throw new Error("account insert failed");
    }
    stage = "profile creation";
    await db.insert(profiles).values({ email: username, displayName: username }).onConflictDoNothing();
    stage = "session creation";
    const session = await startSession(username);
    const response = apiJson(request, { user: { username }, token: session.token, recoveryCode }, { status: 201 });
    response.headers.set("set-cookie", session.cookie);
    return response;
  } catch (error) {
    console.error("Registration failed", error);
    return apiJson(request, { code: "registration_failed", error: `Could not complete registration during ${stage}. Please try again.` }, { status: 500 });
  }
}
