import { and, asc, eq, gte, sql } from "drizzle-orm";
import { communityComments, communityPosts, communityProfiles, communityReactions, moderationCases, profiles } from "../../../../db/schema";
import { apiJson, apiOptions } from "../../../api-response";
import { moderateCommunityText } from "../../../community-moderation";
import { notify, requireCommunityUser } from "../../../community-server";
import { canShowCommunityItem } from "../../../community-visibility";
import { isAdminUsername } from "../../../server-auth";

export const OPTIONS = apiOptions;

export async function GET(request: Request) {
  const access = await requireCommunityUser(request); if ("response" in access) return access.response;
  const { db, user } = access; const postId = Number(new URL(request.url).searchParams.get("postId"));
  if (!postId) return apiJson(request, { error: "A post is required." }, { status: 400 });
  const [rows, reactions, people, accounts] = await Promise.all([
    db.select().from(communityComments).where(eq(communityComments.postId, postId)).orderBy(asc(communityComments.createdAt)),
    db.select().from(communityReactions).where(eq(communityReactions.targetType, "comment")), db.select().from(communityProfiles), db.select({ email: profiles.email, displayName: profiles.displayName }).from(profiles),
  ]);
  const personMap = new Map(people.map((person) => [person.userEmail, person])); const accountMap = new Map(accounts.map((account) => [account.email, account]));
  const comments = rows.filter((row) => canShowCommunityItem(row.status, row.authorEmail === user.email, user.isAdmin)).map((row) => { const person = personMap.get(row.authorEmail); return ({ ...row, own: row.authorEmail === user.email, author: { username: row.authorEmail, displayName: person?.nickname?.trim() || accountMap.get(row.authorEmail)?.displayName || row.authorEmail, isAdmin: isAdminUsername(row.authorEmail), avatarColor: person?.avatarColor ?? "indigo", hasAvatar: Boolean(person?.avatarKey), avatarVersion: person?.avatarKey ?? "" }, likeCount: reactions.filter((reaction) => reaction.targetId === row.id && reaction.reactionType === "like").length, liked: reactions.some((reaction) => reaction.targetId === row.id && reaction.userEmail === user.email && reaction.reactionType === "like") }); });
  return apiJson(request, { comments });
}

export async function POST(request: Request) {
  const access = await requireCommunityUser(request); if ("response" in access) return access.response;
  const { db, user } = access; const payload = await request.json() as { postId?: number; parentId?: number | null; body?: string };
  const postId = Number(payload.postId); const body = String(payload.body ?? "").trim();
  if (body.length < 2 || body.length > 2000) return apiJson(request, { error: "Use a comment between 2 and 2,000 characters." }, { status: 400 });
  const [post] = await db.select().from(communityPosts).where(eq(communityPosts.id, postId)).limit(1);
  if (!post || post.status !== "visible") return apiJson(request, { error: "Post not found." }, { status: 404 });
  if (post.locked) return apiJson(request, { error: "This discussion is locked." }, { status: 409 });
  let parent: typeof communityComments.$inferSelect | null = null;
  if (payload.parentId) { [parent] = await db.select().from(communityComments).where(and(eq(communityComments.id, Number(payload.parentId)), eq(communityComments.postId, postId))).limit(1); if (!parent) return apiJson(request, { error: "Reply target not found." }, { status: 404 }); }
  const since = new Date(Date.now() - 5 * 60_000).toISOString(); const recent = await db.select({ count: sql<number>`count(*)` }).from(communityComments).where(and(eq(communityComments.authorEmail, user.email), gte(communityComments.createdAt, since)));
  if (Number(recent[0]?.count ?? 0) >= 15) return apiJson(request, { error: "Please wait before commenting again." }, { status: 429 });
  const moderation = moderateCommunityText("", body); const now = new Date().toISOString();
  const [comment] = await db.insert(communityComments).values({ postId, authorEmail: user.email, parentId: parent?.parentId ?? parent?.id ?? null, body, status: moderation.severity === "block" ? "hidden" : "visible", moderationState: moderation.moderationState, moderationSignals: JSON.stringify(moderation.signals), createdAt: now, updatedAt: now }).returning();
  if (moderation.severity !== "none") await db.insert(moderationCases).values({ source: "automated", targetType: "comment", targetId: comment.id, targetAuthor: user.email, reason: moderation.severity === "block" ? "Comment automatically hidden for urgent review" : "Comment sent for administrator review", severity: moderation.severity === "block" ? "high" : "medium", signals: JSON.stringify(moderation.signals), createdAt: now, updatedAt: now });
  await notify(db, parent?.authorEmail ?? post.authorEmail, parent ? `${user.displayName} replied to your comment.` : `${user.displayName} commented on your post.`, { type: parent ? "reply" : "comment", actorEmail: user.email, postId, commentId: comment.id });
  return apiJson(request, { comment, moderation: { state: moderation.moderationState, hidden: moderation.severity === "block" } }, { status: 201 });
}

export async function PATCH(request: Request) {
  const access = await requireCommunityUser(request); if ("response" in access) return access.response;
  const { db, user } = access; const payload = await request.json() as { action?: string; commentId?: number; body?: string }; const id = Number(payload.commentId);
  const [comment] = await db.select().from(communityComments).where(eq(communityComments.id, id)).limit(1); if (!comment) return apiJson(request, { error: "Comment not found." }, { status: 404 });
  if (payload.action === "like") { const where = and(eq(communityReactions.userEmail, user.email), eq(communityReactions.targetType, "comment"), eq(communityReactions.targetId, id), eq(communityReactions.reactionType, "like")); const [existing] = await db.select().from(communityReactions).where(where).limit(1); if (existing) await db.delete(communityReactions).where(eq(communityReactions.id, existing.id)); else await db.insert(communityReactions).values({ userEmail: user.email, targetType: "comment", targetId: id, reactionType: "like" }); if (!existing) await notify(db, comment.authorEmail, `${user.displayName} liked your comment.`, { type: "like", actorEmail: user.email, postId: comment.postId, commentId: id }); return apiJson(request, { liked: !existing }); }
  if (comment.authorEmail !== user.email && !user.isAdmin) return apiJson(request, { error: "You can only change your own comment." }, { status: 403 });
  if (payload.action === "delete") { await db.update(communityComments).set({ status: "deleted", body: "", updatedAt: new Date().toISOString() }).where(eq(communityComments.id, id)); return apiJson(request, { deleted: true }); }
  if (payload.action === "edit") { const body = String(payload.body ?? "").trim(); if (body.length < 2 || body.length > 2000) return apiJson(request, { error: "Check the comment length." }, { status: 400 }); const moderation = moderateCommunityText("", body); await db.update(communityComments).set({ body, status: moderation.severity === "block" ? "hidden" : "visible", moderationState: moderation.moderationState, moderationSignals: JSON.stringify(moderation.signals), updatedAt: new Date().toISOString() }).where(eq(communityComments.id, id)); if (moderation.severity !== "none") await db.insert(moderationCases).values({ source: "automated", targetType: "comment", targetId: id, targetAuthor: comment.authorEmail, reason: "Edited comment requires review", severity: moderation.severity === "block" ? "high" : "medium", signals: JSON.stringify(moderation.signals) }); return apiJson(request, { updated: true }); }
  return apiJson(request, { error: "Unsupported action." }, { status: 400 });
}
