import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { accounts } from "../../../../db/schema";
import { createPasswordRecord, createRecoveryCode, normalizeRecoveryCode } from "../../../password-auth";
import { requireApiUser } from "../../../server-auth";
import { apiJson, apiOptions } from "../../../api-response";

export const OPTIONS = apiOptions;

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    if (!user) return apiJson(request, { error: "Sign in required" }, { status: 401 });
    const { env } = await import("cloudflare:workers");
    const recoveryCode = createRecoveryCode();
    const record = await createPasswordRecord(normalizeRecoveryCode(recoveryCode), String(env.AUTH_PEPPER ?? ""));
    await ensureSchema();
    const db = await getDb();
    await db.update(accounts).set({ recoveryHash: record.passwordHash, recoverySalt: record.passwordSalt }).where(eq(accounts.username, user.email));
    return apiJson(request, { recoveryCode });
  } catch (error) {
    console.error("Recovery code creation failed", error);
    return apiJson(request, { error: "Could not create a recovery code. Please try again." }, { status: 500 });
  }
}
