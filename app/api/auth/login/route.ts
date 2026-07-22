import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { accounts, profiles } from "../../../../db/schema";
import { activeSanction } from "../../../account-status";
import { startSession } from "../../../auth-session";
import { normalizeUsername, verifyPassword } from "../../../password-auth";
import { apiJson, apiOptions } from "../../../api-response";

export const OPTIONS = apiOptions;

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { username?: string; password?: string };
    const username = normalizeUsername(payload.username ?? "");
    const password = payload.password ?? "";
    await ensureSchema();
    const db = await getDb();
    const [account] = await db.select().from(accounts).where(eq(accounts.username, username)).limit(1);
    const { env } = await import("cloudflare:workers");
    if (!account || !(await verifyPassword(password, account.passwordSalt, account.passwordHash, String(env.AUTH_PEPPER ?? "")))) {
      return apiJson(request, { error: "The username or password is incorrect." }, { status: 401 });
    }
    const [profile] = await db.select().from(profiles).where(eq(profiles.email, username)).limit(1);
    const sanction = activeSanction(profile);
    if (sanction) return apiJson(request, { error: sanction.kind === "banned" ? "This account has been permanently suspended." : `This account is suspended until ${new Date(sanction.until!).toLocaleString("en-GB")}.`, sanction }, { status: 403 });
    if (profile?.accountStatus === "suspended") await db.update(profiles).set({ accountStatus: "active", suspendedUntil: null, suspensionReason: "", updatedAt: new Date().toISOString() }).where(eq(profiles.email, username));
    const session = await startSession(username);
    const response = apiJson(request, { user: { username }, token: session.token });
    response.headers.set("set-cookie", session.cookie);
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return apiJson(request, { error: "Could not log in. Please try again shortly." }, { status: 500 });
  }
}
