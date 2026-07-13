import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { accounts } from "../../../../db/schema";
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
    const session = await startSession(username);
    const response = apiJson(request, { user: { username }, token: session.token });
    response.headers.set("set-cookie", session.cookie);
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return apiJson(request, { error: "Could not log in. Please try again shortly." }, { status: 500 });
  }
}
