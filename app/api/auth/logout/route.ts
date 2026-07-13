import { endSession } from "../../../auth-session";
import { SESSION_COOKIE, sessionCookie } from "../../../password-auth";
import { apiJson, apiOptions } from "../../../api-response";

export const OPTIONS = apiOptions;

export async function POST(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+([a-f0-9]{64})$/i)?.[1];
  const token = bearer ?? cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1) ?? null;
  await endSession(token);
  const response = apiJson(request, { ok: true });
  response.headers.set("set-cookie", sessionCookie("", 0));
  return response;
}
