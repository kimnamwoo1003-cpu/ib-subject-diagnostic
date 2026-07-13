import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { accounts, profiles } from "../../../../db/schema";
import { startSession } from "../../../auth-session";
import { createPasswordRecord, normalizeUsername, validatePassword, validateUsername } from "../../../password-auth";
import { ADMIN_USERNAME } from "../../../server-auth";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { username?: string; password?: string; adminCode?: string };
    const username = normalizeUsername(payload.username ?? "");
    const password = payload.password ?? "";
    const validationError = validateUsername(username) ?? validatePassword(password);
    if (validationError) return Response.json({ error: validationError }, { status: 400 });
    if (username === ADMIN_USERNAME) {
      const { env } = await import("cloudflare:workers");
      const expectedCode = String(env.ADMIN_SETUP_CODE ?? "");
      if (!expectedCode || payload.adminCode !== expectedCode) {
        return Response.json({ error: "관리자 계정을 만들려면 올바른 1회용 등록 코드가 필요합니다." }, { status: 403 });
      }
    }

    await ensureSchema();
    const db = await getDb();
    const [existing] = await db.select({ username: accounts.username }).from(accounts).where(eq(accounts.username, username)).limit(1);
    if (existing) return Response.json({ code: "username_taken", error: "이미 사용 중인 계정 이름입니다." }, { status: 409 });

    const passwordRecord = await createPasswordRecord(password);
    try {
      await db.insert(accounts).values({ username, ...passwordRecord });
    } catch {
      return Response.json({ code: "username_taken", error: "이미 사용 중인 계정 이름입니다." }, { status: 409 });
    }
    await db.insert(profiles).values({ email: username, displayName: username }).onConflictDoNothing();
    const response = Response.json({ user: { username } }, { status: 201 });
    response.headers.set("set-cookie", await startSession(username));
    return response;
  } catch (error) {
    console.error("Registration failed", error);
    return Response.json({ error: "회원가입을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
