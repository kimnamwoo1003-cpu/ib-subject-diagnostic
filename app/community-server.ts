import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { communityNotifications, profiles } from "../db/schema";
import { apiJson } from "./api-response";
import { requireApiUser } from "./server-auth";

export async function requireCommunityUser(request: Request) {
  const user = await requireApiUser({ allowSuspended: true });
  if (!user) return { response: apiJson(request, { error: "Sign in required" }, { status: 401 }) } as const;
  if (user.sanction) return { response: apiJson(request, { error: user.sanction.kind === "banned" ? "This account is permanently suspended." : "This account is temporarily suspended.", sanction: user.sanction }, { status: 403 }) } as const;
  const db = await getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.email, user.email)).limit(1);
  if (!user.isAdmin && !profile?.premium) return { response: apiJson(request, { error: "IB Commons is available to Premium members only." }, { status: 403 }) } as const;
  return { user, profile, db } as const;
}

export async function notify(db: Awaited<ReturnType<typeof getDb>>, userEmail: string, message: string, options: { type?: string; actorEmail?: string; postId?: number; commentId?: number } = {}) {
  if (!userEmail || userEmail === options.actorEmail) return;
  await db.insert(communityNotifications).values({ userEmail, message, type: options.type ?? "community", actorEmail: options.actorEmail, postId: options.postId, commentId: options.commentId });
}

export function cleanTags(value: unknown) {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(",");
  return [...new Set(raw.map((tag) => String(tag).trim().replace(/^#/, "").slice(0, 24)).filter(Boolean))].slice(0, 5);
}
