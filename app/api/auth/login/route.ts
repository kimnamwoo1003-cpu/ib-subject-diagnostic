import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { accounts } from "../../../../db/schema";
import { startSession } from "../../../auth-session";
import { normalizeUsername, verifyPassword } from "../../../password-auth";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { username?: string; password?: string };
    const username = normalizeUsername(payload.username ?? "");
    const password = payload.password ?? "";
    await ensureSchema();
    const db = await getDb();
    const [account] = await db.select().from(accounts).where(eq(accounts.username, username)).limit(1);
    if (!account || !(await verifyPassword(password, account.passwordSalt, account.passwordHash))) {
      return Response.json({ error: "계정 이름 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    }
    const response = Response.json({ user: { username } });
    response.headers.set("set-cookie", await startSession(username));
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return Response.json({ error: "로그인할 수 없습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
