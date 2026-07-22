import { and, desc, eq, gte, sql } from "drizzle-orm";
import { communityBookmarks, communityComments, communityFollows, communityNotifications, communityPosts, communityProfiles, communityReactions, moderationCases, profiles } from "../../../../db/schema";
import { apiJson, apiOptions } from "../../../api-response";
import { COMMUNITY_CATEGORIES, moderateCommunityText } from "../../../community-moderation";
import { cleanTags, notify, requireCommunityUser } from "../../../community-server";
import { canShowCommunityItem } from "../../../community-visibility";
import { isAdminUsername, safeJson } from "../../../server-auth";

export const OPTIONS = apiOptions;

export async function GET(request: Request) {
  const access = await requireCommunityUser(request);
  if ("response" in access) return access.response;
  const { db, user } = access;
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const category = url.searchParams.get("category") ?? "all";
  const filter = url.searchParams.get("filter") ?? "feed";
  const sort = url.searchParams.get("sort") ?? "latest";
  const [rawPosts, comments, reactions, bookmarks, communityPeople, accountPeople, follows, unread] = await Promise.all([
    db.select().from(communityPosts).orderBy(desc(communityPosts.pinned), desc(communityPosts.createdAt)).limit(250),
    db.select().from(communityComments), db.select().from(communityReactions), db.select().from(communityBookmarks),
    db.select().from(communityProfiles), db.select({ email: profiles.email, displayName: profiles.displayName, selectedSubjects: profiles.selectedSubjects, subjectLevels: profiles.subjectLevels }).from(profiles),
    db.select().from(communityFollows),
    db.select({ count: sql<number>`count(*)` }).from(communityNotifications).where(and(eq(communityNotifications.userEmail, user.email), eq(communityNotifications.read, false))),
  ]);
  const profilesByEmail = new Map(communityPeople.map((profile) => [profile.userEmail, profile]));
  const accountsByEmail = new Map(accountPeople.map((profile) => [profile.email, profile]));
  let posts = rawPosts.filter((post) => canShowCommunityItem(post.status, post.authorEmail === user.email, user.isAdmin));
  if (category !== "all") posts = posts.filter((post) => post.category === category);
  if (query) posts = posts.filter((post) => `${post.title} ${post.body} ${post.tags}`.toLowerCase().includes(query));
  if (filter === "bookmarks") posts = posts.filter((post) => bookmarks.some((row) => row.userEmail === user.email && row.postId === post.id));
  if (filter === "mine") posts = posts.filter((post) => post.authorEmail === user.email);
  const decorate = (post: typeof rawPosts[number]) => {
    const account = accountsByEmail.get(post.authorEmail); const person = profilesByEmail.get(post.authorEmail);
    const likeCount = reactions.filter((row) => row.targetType === "post" && row.targetId === post.id && row.reactionType === "like").length;
    const commentCount = comments.filter((row) => row.postId === post.id && row.status === "visible").length;
    return { ...post, tags: safeJson<string[]>(post.tags, []), moderationSignals: post.authorEmail === user.email || user.isAdmin ? safeJson(post.moderationSignals, []) : [],
      author: { username: post.authorEmail, displayName: person?.nickname?.trim() || account?.displayName || post.authorEmail, isAdmin: isAdminUsername(post.authorEmail), bio: person?.bio ?? "", school: person?.school ?? "", graduationYear: person?.graduationYear ?? null, avatarColor: person?.avatarColor ?? "indigo", hasAvatar: Boolean(person?.avatarKey), avatarVersion: person?.avatarKey ?? "", selectedSubjects: safeJson<string[]>(account?.selectedSubjects ?? "[]", []), subjectLevels: safeJson(account?.subjectLevels ?? "{}", {}) },
      likeCount, commentCount, liked: reactions.some((row) => row.userEmail === user.email && row.targetType === "post" && row.targetId === post.id && row.reactionType === "like"),
      bookmarked: bookmarks.some((row) => row.userEmail === user.email && row.postId === post.id), followed: follows.some((row) => row.followerEmail === user.email && row.followingEmail === post.authorEmail), own: post.authorEmail === user.email };
  };
  let decorated = posts.map(decorate);
  if (sort === "popular") decorated.sort((a, b) => (b.likeCount + b.commentCount * 2 + b.viewCount / 5) - (a.likeCount + a.commentCount * 2 + a.viewCount / 5));
  if (sort === "unanswered") decorated = decorated.filter((post) => post.commentCount === 0);
  const tagCounts = new Map<string, number>(); decorated.forEach((post) => post.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)));
  return apiJson(request, { posts: decorated.slice(0, 100), categories: COMMUNITY_CATEGORIES, trendingTags: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag, count]) => ({ tag, count })), unread: Number(unread[0]?.count ?? 0), currentUser: { username: user.email, isAdmin: user.isAdmin, profile: profilesByEmail.get(user.email) ?? null } });
}

export async function POST(request: Request) {
  const access = await requireCommunityUser(request); if ("response" in access) return access.response;
  const { db, user } = access;
  const payload = await request.json() as { title?: string; body?: string; category?: string; tags?: string[] | string };
  const title = String(payload.title ?? "").trim(); const body = String(payload.body ?? "").trim(); const category = String(payload.category ?? ""); const tags = cleanTags(payload.tags);
  if (title.length < 5 || title.length > 120) return apiJson(request, { error: "Use a title between 5 and 120 characters." }, { status: 400 });
  if (body.length < 10 || body.length > 5000) return apiJson(request, { error: "Use a post between 10 and 5,000 characters." }, { status: 400 });
  if (!COMMUNITY_CATEGORIES.some((item) => item.id === category)) return apiJson(request, { error: "Choose a valid category." }, { status: 400 });
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const recent = await db.select({ count: sql<number>`count(*)` }).from(communityPosts).where(and(eq(communityPosts.authorEmail, user.email), gte(communityPosts.createdAt, since)));
  if (Number(recent[0]?.count ?? 0) >= 5) return apiJson(request, { error: "Please wait before creating another post." }, { status: 429 });
  const moderation = moderateCommunityText(title, body); const now = new Date().toISOString();
  const [post] = await db.insert(communityPosts).values({ authorEmail: user.email, title, body, category, tags: JSON.stringify(tags), status: moderation.severity === "block" ? "hidden" : "visible", moderationState: moderation.moderationState, moderationSignals: JSON.stringify(moderation.signals), createdAt: now, updatedAt: now }).returning();
  if (moderation.severity !== "none") await db.insert(moderationCases).values({ source: "automated", targetType: "post", targetId: post.id, targetAuthor: user.email, reason: moderation.severity === "block" ? "Content automatically hidden for urgent review" : "Content sent for administrator review", severity: moderation.severity === "block" ? "high" : "medium", signals: JSON.stringify(moderation.signals), createdAt: now, updatedAt: now });
  const followers = await db.select().from(communityFollows).where(eq(communityFollows.followingEmail, user.email));
  await Promise.all(followers.slice(0, 100).map((row) => notify(db, row.followerEmail, `${user.displayName} posted: ${title}`, { actorEmail: user.email, postId: post.id, type: "new-post" })));
  return apiJson(request, { post, moderation: { state: moderation.moderationState, hidden: moderation.severity === "block" } }, { status: 201 });
}

export async function PATCH(request: Request) {
  const access = await requireCommunityUser(request); if ("response" in access) return access.response;
  const { db, user } = access; const payload = await request.json() as { action?: string; postId?: number; title?: string; body?: string; category?: string; tags?: string[] | string; targetUser?: string };
  if (payload.action === "follow") {
    const target = String(payload.targetUser ?? "").trim().toLowerCase();
    if (!target) return apiJson(request, { error: "Choose a member to follow." }, { status: 400 });
    if (target === user.email) return apiJson(request, { error: "You cannot follow yourself." }, { status: 400 });
    const [targetAccount] = await db.select({ email: profiles.email }).from(profiles).where(eq(profiles.email, target)).limit(1);
    if (!targetAccount) return apiJson(request, { error: "Member not found." }, { status: 404 });
    const where = and(eq(communityFollows.followerEmail, user.email), eq(communityFollows.followingEmail, target)); const [existing] = await db.select().from(communityFollows).where(where).limit(1);
    if (existing) await db.delete(communityFollows).where(eq(communityFollows.id, existing.id)); else await db.insert(communityFollows).values({ followerEmail: user.email, followingEmail: target });
    if (!existing) await notify(db, target, `${user.displayName} followed you.`, { type: "follow", actorEmail: user.email });
    return apiJson(request, { followed: !existing });
  }
  const postId = Number(payload.postId); const [post] = await db.select().from(communityPosts).where(eq(communityPosts.id, postId)).limit(1);
  if (!post) return apiJson(request, { error: "Post not found." }, { status: 404 });
  if (payload.action === "like") {
    const where = and(eq(communityReactions.userEmail, user.email), eq(communityReactions.targetType, "post"), eq(communityReactions.targetId, postId), eq(communityReactions.reactionType, "like"));
    const [existing] = await db.select().from(communityReactions).where(where).limit(1);
    if (existing) await db.delete(communityReactions).where(eq(communityReactions.id, existing.id)); else await db.insert(communityReactions).values({ userEmail: user.email, targetType: "post", targetId: postId, reactionType: "like" });
    if (!existing) await notify(db, post.authorEmail, `${user.displayName} liked your post.`, { type: "like", actorEmail: user.email, postId });
    return apiJson(request, { liked: !existing });
  }
  if (payload.action === "bookmark") {
    const where = and(eq(communityBookmarks.userEmail, user.email), eq(communityBookmarks.postId, postId)); const [existing] = await db.select().from(communityBookmarks).where(where).limit(1);
    if (existing) await db.delete(communityBookmarks).where(eq(communityBookmarks.id, existing.id)); else await db.insert(communityBookmarks).values({ userEmail: user.email, postId });
    return apiJson(request, { bookmarked: !existing });
  }
  if (payload.action === "view") { await db.update(communityPosts).set({ viewCount: sql`${communityPosts.viewCount} + 1` }).where(eq(communityPosts.id, postId)); return apiJson(request, { viewed: true }); }
  if (payload.action === "pin" || payload.action === "lock") {
    if (!user.isAdmin) return apiJson(request, { error: "Admin access required." }, { status: 403 });
    await db.update(communityPosts).set(payload.action === "pin" ? { pinned: !post.pinned } : { locked: !post.locked }).where(eq(communityPosts.id, postId)); return apiJson(request, { updated: true });
  }
  if (post.authorEmail !== user.email && !user.isAdmin) return apiJson(request, { error: "You can only change your own post." }, { status: 403 });
  if (payload.action === "delete") {
    if (post.status !== "deleted") await db.update(communityPosts).set({ status: "deleted", body: "", updatedAt: new Date().toISOString() }).where(eq(communityPosts.id, postId));
    return apiJson(request, { deleted: true });
  }
  if (payload.action === "edit") {
    const title = String(payload.title ?? post.title).trim(); const body = String(payload.body ?? post.body).trim(); const category = String(payload.category ?? post.category);
    if (title.length < 5 || title.length > 120 || body.length < 10 || body.length > 5000 || !COMMUNITY_CATEGORIES.some((item) => item.id === category)) return apiJson(request, { error: "Check the title, post length and category." }, { status: 400 });
    const moderation = moderateCommunityText(title, body); await db.update(communityPosts).set({ title, body, category, tags: JSON.stringify(cleanTags(payload.tags ?? safeJson(post.tags, []))), status: moderation.severity === "block" ? "hidden" : "visible", moderationState: moderation.moderationState, moderationSignals: JSON.stringify(moderation.signals), updatedAt: new Date().toISOString() }).where(eq(communityPosts.id, postId));
    if (moderation.severity !== "none") await db.insert(moderationCases).values({ source: "automated", targetType: "post", targetId: postId, targetAuthor: post.authorEmail, reason: "Edited content requires review", severity: moderation.severity === "block" ? "high" : "medium", signals: JSON.stringify(moderation.signals) });
    return apiJson(request, { updated: true, moderation: moderation.moderationState });
  }
  return apiJson(request, { error: "Unsupported action." }, { status: 400 });
}
