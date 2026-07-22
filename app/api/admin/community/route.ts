import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { communityComments, communityNotifications, communityPosts, communityReports, moderationCases, profiles } from "../../../../db/schema";
import { apiJson, apiOptions } from "../../../api-response";
import { ADMIN_USERNAME, requireApiUser, safeJson } from "../../../server-auth";

export const OPTIONS = apiOptions;

export async function GET(request: Request) {
  const user = await requireApiUser(); if (!user?.isAdmin) return apiJson(request, { error: "Admin access required" }, { status: 403 });
  const { getDb } = await import("../../../../db"); const db = await getDb();
  const [cases, posts, comments, reports, accounts, stats] = await Promise.all([
    db.select().from(moderationCases).orderBy(asc(moderationCases.status), desc(moderationCases.createdAt)).limit(300), db.select().from(communityPosts).orderBy(desc(communityPosts.createdAt)).limit(500), db.select().from(communityComments).orderBy(desc(communityComments.createdAt)).limit(1000), db.select().from(communityReports).orderBy(desc(communityReports.createdAt)).limit(500), db.select().from(profiles).where(ne(profiles.accountStatus, "active")).orderBy(desc(profiles.updatedAt)),
    Promise.all([db.select({ count: sql<number>`count(*)` }).from(communityPosts).where(eq(communityPosts.status, "visible")), db.select({ count: sql<number>`count(*)` }).from(moderationCases).where(eq(moderationCases.status, "pending")), db.select({ count: sql<number>`count(*)` }).from(communityReports).where(eq(communityReports.status, "pending"))]),
  ]);
  const decorated = cases.map((item) => { const target = item.targetType === "post" ? posts.find((row) => row.id === item.targetId) : comments.find((row) => row.id === item.targetId); return { ...item, signals: safeJson(item.signals, []), target: target ? { id: target.id, title: "title" in target ? target.title : null, body: target.body, status: target.status, postId: "postId" in target ? target.postId : target.id } : null, reports: reports.filter((report) => report.targetType === item.targetType && report.targetId === item.targetId) }; });
  return apiJson(request, { cases: decorated, sanctionedAccounts: accounts.map((account) => ({ username: account.email, displayName: account.displayName, accountStatus: account.accountStatus, suspendedUntil: account.suspendedUntil, suspensionReason: account.suspensionReason, moderationStrikes: account.moderationStrikes })), stats: { visiblePosts: Number(stats[0][0]?.count ?? 0), pendingCases: Number(stats[1][0]?.count ?? 0), pendingReports: Number(stats[2][0]?.count ?? 0) } });
}

export async function PATCH(request: Request) {
  const user = await requireApiUser(); if (!user?.isAdmin) return apiJson(request, { error: "Admin access required" }, { status: 403 });
  const { getDb } = await import("../../../../db"); const db = await getDb(); const payload = await request.json() as { caseId?: number; action?: string; adminNote?: string; targetUser?: string };
  const action = String(payload.action ?? ""); const note = String(payload.adminNote ?? "").trim().slice(0, 500); const now = new Date().toISOString();
  if (action === "reinstate") { const target = String(payload.targetUser ?? "").trim().toLowerCase(); if (!target) return apiJson(request, { error: "Choose an account." }, { status: 400 }); await db.update(profiles).set({ accountStatus: "active", suspendedUntil: null, suspensionReason: "", updatedAt: now }).where(eq(profiles.email, target)); await db.insert(communityNotifications).values({ userEmail: target, type: "moderation", actorEmail: user.email, message: "Your community access has been restored." }); return apiJson(request, { updated: true }); }
  const caseId = Number(payload.caseId); const [moderationCase] = await db.select().from(moderationCases).where(eq(moderationCases.id, caseId)).limit(1); if (!moderationCase) return apiJson(request, { error: "Moderation case not found." }, { status: 404 });
  if (moderationCase.status !== "pending") return apiJson(request, { error: "This case has already been reviewed." }, { status: 409 });
  if (["remove", "warn", "suspend-1d", "suspend-7d", "suspend-30d", "ban"].includes(action) && !note) return apiJson(request, { error: "Add an administrator note explaining this action." }, { status: 400 });
  if (["suspend-1d", "suspend-7d", "suspend-30d", "ban"].includes(action) && moderationCase.targetAuthor === ADMIN_USERNAME) return apiJson(request, { error: "The designated administrator account cannot be suspended here." }, { status: 400 });
  if (action === "dismiss") {
    await db.batch([db.update(moderationCases).set({ status: "dismissed", reviewedBy: user.email, reviewedAt: now, adminNote: note, updatedAt: now }).where(eq(moderationCases.id, caseId)), db.update(communityReports).set({ status: "dismissed" }).where(and(eq(communityReports.targetType, moderationCase.targetType), eq(communityReports.targetId, moderationCase.targetId)))]); return apiJson(request, { updated: true });
  }
  if (action === "remove") {
    const removeContent = moderationCase.targetType === "post" ? db.update(communityPosts).set({ status: "removed", updatedAt: now }).where(eq(communityPosts.id, moderationCase.targetId)) : db.update(communityComments).set({ status: "removed", updatedAt: now }).where(eq(communityComments.id, moderationCase.targetId));
    await db.batch([removeContent, db.update(moderationCases).set({ status: "removed", reviewedBy: user.email, reviewedAt: now, adminNote: note, updatedAt: now }).where(eq(moderationCases.id, caseId)), db.update(communityReports).set({ status: "resolved" }).where(and(eq(communityReports.targetType, moderationCase.targetType), eq(communityReports.targetId, moderationCase.targetId))), db.insert(communityNotifications).values({ userEmail: moderationCase.targetAuthor, type: "moderation", actorEmail: user.email, message: `A community contribution was removed. Administrator note: ${note}` })]); return apiJson(request, { updated: true });
  }
  if (action === "warn") {
    await db.batch([db.update(profiles).set({ moderationStrikes: sql`${profiles.moderationStrikes} + 1`, updatedAt: now }).where(eq(profiles.email, moderationCase.targetAuthor)), db.update(moderationCases).set({ status: "warned", reviewedBy: user.email, reviewedAt: now, adminNote: note, updatedAt: now }).where(eq(moderationCases.id, caseId)), db.insert(communityNotifications).values({ userEmail: moderationCase.targetAuthor, type: "moderation", actorEmail: user.email, message: `Administrator warning: ${note}` })]); return apiJson(request, { updated: true });
  }
  const days = action === "suspend-1d" ? 1 : action === "suspend-7d" ? 7 : action === "suspend-30d" ? 30 : 0;
  if (days || action === "ban") {
    const until = days ? new Date(Date.now() + days * 86_400_000).toISOString() : null; const status = action === "ban" ? "banned" : "suspended";
    await db.batch([db.update(profiles).set({ accountStatus: status, suspendedUntil: until, suspensionReason: note, moderationStrikes: sql`${profiles.moderationStrikes} + 1`, updatedAt: now }).where(eq(profiles.email, moderationCase.targetAuthor)), db.update(moderationCases).set({ status: status, reviewedBy: user.email, reviewedAt: now, adminNote: note, updatedAt: now }).where(eq(moderationCases.id, caseId)), db.insert(communityNotifications).values({ userEmail: moderationCase.targetAuthor, type: "moderation", actorEmail: user.email, message: action === "ban" ? `Your account has been permanently suspended. Reason: ${note}` : `Your account is suspended until ${new Date(until!).toLocaleString("en-GB")}. Reason: ${note}` })]); return apiJson(request, { updated: true });
  }
  return apiJson(request, { error: "Unsupported moderation action." }, { status: 400 });
}
