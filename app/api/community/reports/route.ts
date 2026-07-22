import { and, eq } from "drizzle-orm";
import { communityComments, communityPosts, communityReports, moderationCases } from "../../../../db/schema";
import { apiJson, apiOptions } from "../../../api-response";
import { requireCommunityUser } from "../../../community-server";

export const OPTIONS = apiOptions;
const reasons = ["harassment", "hate-or-abuse", "threat", "privacy", "sexual-content", "spam", "misinformation", "other"];

export async function POST(request: Request) {
  const access = await requireCommunityUser(request); if ("response" in access) return access.response;
  const { db, user } = access; const payload = await request.json() as { targetType?: "post" | "comment"; targetId?: number; reason?: string; detail?: string };
  const targetType = payload.targetType; const targetId = Number(payload.targetId); const reason = String(payload.reason ?? ""); const detail = String(payload.detail ?? "").trim().slice(0, 500);
  if ((targetType !== "post" && targetType !== "comment") || !targetId || !reasons.includes(reason)) return apiJson(request, { error: "Choose a valid report reason." }, { status: 400 });
  const [target] = targetType === "post" ? await db.select({ authorEmail: communityPosts.authorEmail }).from(communityPosts).where(eq(communityPosts.id, targetId)).limit(1) : await db.select({ authorEmail: communityComments.authorEmail }).from(communityComments).where(eq(communityComments.id, targetId)).limit(1);
  if (!target) return apiJson(request, { error: "Content not found." }, { status: 404 });
  if (target.authorEmail === user.email) return apiJson(request, { error: "You cannot report your own content." }, { status: 400 });
  const [existing] = await db.select().from(communityReports).where(and(eq(communityReports.reporterEmail, user.email), eq(communityReports.targetType, targetType), eq(communityReports.targetId, targetId))).limit(1);
  if (existing) return apiJson(request, { error: "You already reported this content." }, { status: 409 });
  const [report] = await db.insert(communityReports).values({ reporterEmail: user.email, targetType, targetId, reason, detail }).returning();
  await db.insert(moderationCases).values({ source: "user-report", targetType, targetId, targetAuthor: target.authorEmail, reason, severity: reason === "threat" || reason === "privacy" ? "high" : "medium", signals: JSON.stringify([{ code: `report-${reason}`, label: `Member report: ${reason.replaceAll("-", " ")}`, weight: reason === "threat" || reason === "privacy" ? 5 : 2 }]), reportedBy: user.email });
  return apiJson(request, { report, message: "Report sent privately to the administrator." }, { status: 201 });
}
