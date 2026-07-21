import { asc, desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { premiumRequests, profiles, testAttempts, userActivities } from "../../../../db/schema";
import { canReviewPremiumRequest } from "../../../premium-request";
import { apiJson, apiOptions } from "../../../api-response";
import { requireApiUser, safeJson } from "../../../server-auth";

export const OPTIONS = apiOptions;

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    if (!user?.isAdmin) return apiJson(request, { error: "Admin access required" }, { status: 403 });
    await ensureSchema();
    const db = await getDb();
    const [rows, attempts, activities, requests] = await Promise.all([
      db.select().from(profiles).orderBy(asc(profiles.displayName), asc(profiles.email)),
      db.select().from(testAttempts).orderBy(desc(testAttempts.createdAt), desc(testAttempts.id)).limit(2000),
      db.select().from(userActivities).orderBy(desc(userActivities.createdAt), desc(userActivities.id)).limit(2000),
      db.select().from(premiumRequests).orderBy(desc(premiumRequests.createdAt), desc(premiumRequests.id)).limit(500),
    ]);
    const users = rows.map((row) => {
      const userAttempts = attempts.filter((attempt) => attempt.userEmail === row.email);
      const userActivitiesRows = activities.filter((activity) => activity.userEmail === row.email);
      const bySubject = new Map<string, { subjectId: string; attempts: number; averagePercent: number; latestPercent: number; latestLevel: string; latestPaper: string; lastTestAt: string; topics: Array<{ code: string; title: string; percent: number }> }>();
      for (const attempt of userAttempts) {
        const current = bySubject.get(attempt.subjectId);
        const breakdown = safeJson<Array<{ code: string; title: string; percent: number }>>(attempt.topicBreakdown, []);
        if (!current) bySubject.set(attempt.subjectId, { subjectId: attempt.subjectId, attempts: 1, averagePercent: attempt.percent, latestPercent: attempt.percent, latestLevel: attempt.level, latestPaper: attempt.paperName, lastTestAt: attempt.createdAt, topics: breakdown });
        else { current.averagePercent += attempt.percent; current.attempts += 1; }
      }
      const subjectProgress = [...bySubject.values()].map((item) => ({ ...item, averagePercent: Math.round(item.averagePercent / item.attempts) }));
      return {
        ...row,
        selectedSubjects: safeJson<string[]>(row.selectedSubjects, []),
        subjectLevels: safeJson<Record<string, "SL" | "HL">>(row.subjectLevels, {}),
        progress: {
          attemptCount: userAttempts.length,
          averagePercent: userAttempts.length ? Math.round(userAttempts.reduce((sum, attempt) => sum + attempt.percent, 0) / userAttempts.length) : null,
          latestAttempt: userAttempts[0] ? { subjectId: userAttempts[0].subjectId, subjectName: userAttempts[0].subjectName, level: userAttempts[0].level, paperName: userAttempts[0].paperName, percent: userAttempts[0].percent, createdAt: userAttempts[0].createdAt } : null,
          lastActivity: userActivitiesRows[0] ? { ...userActivitiesRows[0], detail: safeJson(userActivitiesRows[0].detail, {}) } : null,
          recentActivities: userActivitiesRows.slice(0, 12).map((activity) => ({ ...activity, detail: safeJson(activity.detail, {}) })),
          subjects: subjectProgress,
        },
        premiumRequest: requests.find((entry) => entry.userEmail === row.email) ?? null,
      };
    });
    return apiJson(request, { users });
  } catch (error) {
    return apiJson(request, { error: error instanceof Error ? error.message : "Admin data unavailable" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireApiUser();
  if (!user?.isAdmin) return apiJson(request, { error: "Admin access required" }, { status: 403 });
  const payload = await request.json() as { email?: string; premium?: boolean; requestId?: number; action?: "approve" | "reject"; decision?: "approve" | "reject"; adminNote?: string };
  await ensureSchema();
  const db = await getDb();
  const action = payload.decision ?? payload.action;
  if (payload.requestId && (action === "approve" || action === "reject")) {
    const [premiumRequest] = await db.select().from(premiumRequests).where(eq(premiumRequests.id, payload.requestId)).limit(1);
    if (!premiumRequest) return apiJson(request, { error: "Premium request not found" }, { status: 404 });
    if (!canReviewPremiumRequest(premiumRequest.status)) return apiJson(request, { error: "This Premium request has already been reviewed." }, { status: 409 });
    const adminNote = String(payload.adminNote ?? "").trim().slice(0, 500);
    const reviewedAt = new Date().toISOString();
    const reviewUpdate = db.update(premiumRequests).set({ status: action === "approve" ? "approved" : "rejected", adminNote, reviewedBy: user.email, reviewedAt, updatedAt: reviewedAt }).where(eq(premiumRequests.id, premiumRequest.id));
    if (action === "approve") await db.batch([reviewUpdate, db.update(profiles).set({ premium: true, updatedAt: reviewedAt }).where(eq(profiles.email, premiumRequest.userEmail))]);
    else await reviewUpdate;
    const [updatedRequest] = await db.select().from(premiumRequests).where(eq(premiumRequests.id, premiumRequest.id)).limit(1);
    return apiJson(request, { premiumRequest: updatedRequest, premium: action === "approve" });
  }
  if (!payload.email || typeof payload.premium !== "boolean") return apiJson(request, { error: "Email and premium status are required" }, { status: 400 });
  const [updated] = await db.update(profiles).set({ premium: payload.premium, updatedAt: new Date().toISOString() }).where(eq(profiles.email, payload.email)).returning();
  if (!updated) return apiJson(request, { error: "Account not found" }, { status: 404 });
  return apiJson(request, { user: { ...updated, selectedSubjects: safeJson(updated.selectedSubjects, []), subjectLevels: safeJson(updated.subjectLevels, {}) } });
}
