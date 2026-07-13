import { endSession } from "../../../auth-session";
import { SESSION_COOKIE, sessionCookie } from "../../../password-auth";

export async function POST(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1) ?? null;
  await endSession(token);
  const response = Response.json({ ok: true });
  response.headers.set("set-cookie", sessionCookie("", 0));
  return response;
}
