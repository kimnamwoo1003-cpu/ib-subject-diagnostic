import { getChatGPTUser } from "./chatgpt-auth";

export async function isAdminEmail(email: string) {
  const { env } = await import("cloudflare:workers");
  const configured = String(env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes(email.trim().toLowerCase());
}

export async function requireApiUser() {
  const user = await getChatGPTUser();
  if (!user) return null;
  return { ...user, isAdmin: await isAdminEmail(user.email) };
}

export function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
