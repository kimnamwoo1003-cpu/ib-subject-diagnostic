import { and, eq, sql } from "drizzle-orm";
import { communityFollows, communityPosts, communityProfiles, profiles } from "../../../../db/schema";
import { apiJson, apiOptions } from "../../../api-response";
import { requireCommunityUser } from "../../../community-server";
import { isAdminUsername, safeJson } from "../../../server-auth";

export const OPTIONS = apiOptions;
const colors = ["indigo", "coral", "teal", "amber", "plum", "sky"];

export async function GET(request: Request) {
  const access = await requireCommunityUser(request); if ("response" in access) return access.response;
  const { db, user } = access; const target = new URL(request.url).searchParams.get("user") ?? user.email;
  const [person, account, postCount, followerCount, followingCount, relationship] = await Promise.all([
    db.select().from(communityProfiles).where(eq(communityProfiles.userEmail, target)).limit(1),
    db.select().from(profiles).where(eq(profiles.email, target)).limit(1),
    db.select({ count: sql<number>`count(*)` }).from(communityPosts).where(and(eq(communityPosts.authorEmail, target), eq(communityPosts.status, "visible"))),
    db.select({ count: sql<number>`count(*)` }).from(communityFollows).where(eq(communityFollows.followingEmail, target)),
    db.select({ count: sql<number>`count(*)` }).from(communityFollows).where(eq(communityFollows.followerEmail, target)),
    db.select().from(communityFollows).where(and(eq(communityFollows.followerEmail, user.email), eq(communityFollows.followingEmail, target))).limit(1),
  ]);
  if (!account[0]) return apiJson(request, { error: "Profile not found." }, { status: 404 });
  return apiJson(request, { profile: { username: target, displayName: person[0]?.nickname?.trim() || account[0].displayName, isAdmin: isAdminUsername(target), bio: person[0]?.bio ?? "", school: person[0]?.school ?? "", graduationYear: person[0]?.graduationYear ?? null, avatarColor: person[0]?.avatarColor ?? "indigo", hasAvatar: Boolean(person[0]?.avatarKey), avatarVersion: person[0]?.avatarKey ?? "", selectedSubjects: safeJson(account[0].selectedSubjects, []), subjectLevels: safeJson(account[0].subjectLevels, {}), postCount: Number(postCount[0]?.count ?? 0), followerCount: Number(followerCount[0]?.count ?? 0), followingCount: Number(followingCount[0]?.count ?? 0), followed: relationship.length > 0, own: target === user.email } });
}

export async function PATCH(request: Request) {
  const access = await requireCommunityUser(request); if ("response" in access) return access.response;
  const { db, user } = access; const payload = await request.json() as { nickname?: string; bio?: string; school?: string; graduationYear?: number | null; avatarColor?: string };
  const nickname = String(payload.nickname ?? "").trim(); const bio = String(payload.bio ?? "").trim().slice(0, 300); const school = String(payload.school ?? "").trim().slice(0, 80); const year = payload.graduationYear === null || payload.graduationYear === undefined || payload.graduationYear === 0 ? null : Number(payload.graduationYear); const avatarColor = colors.includes(String(payload.avatarColor)) ? String(payload.avatarColor) : "indigo";
  if (nickname.length < 2 || nickname.length > 30 || !/^[\p{L}\p{N} _.-]+$/u.test(nickname)) return apiJson(request, { error: "Use a nickname between 2 and 30 characters. Letters, numbers, spaces, underscores, periods and hyphens are allowed." }, { status: 400 });
  if (/^(admin|administrator|moderator)$/i.test(nickname) && !user.isAdmin) return apiJson(request, { error: "That nickname is reserved." }, { status: 409 });
  if (year !== null && (!Number.isInteger(year) || year < new Date().getFullYear() - 2 || year > new Date().getFullYear() + 10)) return apiJson(request, { error: "Choose a valid graduation year." }, { status: 400 });
  await db.insert(communityProfiles).values({ userEmail: user.email, nickname, bio, school, graduationYear: year, avatarColor }).onConflictDoUpdate({ target: communityProfiles.userEmail, set: { nickname, bio, school, graduationYear: year, avatarColor, updatedAt: new Date().toISOString() } });
  return apiJson(request, { updated: true });
}
