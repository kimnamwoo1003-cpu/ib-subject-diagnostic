import { and, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { gradeGoals, profiles } from "../../../../db/schema";
import { apiJson, apiOptions } from "../../../api-response";
import { requireApiUser, safeJson } from "../../../server-auth";

export const OPTIONS = apiOptions;

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiJson(request, { error: "Sign in required" }, { status: 401 });
  await ensureSchema();
  const db = await getDb();
  const [profile] = await db.select({ premium: profiles.premium, selectedSubjects: profiles.selectedSubjects, subjectLevels: profiles.subjectLevels }).from(profiles).where(eq(profiles.email, user.email)).limit(1);
  if (!profile?.premium) return apiJson(request, { error: "Premium access required" }, { status: 403 });
  const payload = await request.json() as Record<string, unknown>;
  const subjectId = String(payload.subjectId ?? "").trim();
  const level = String(payload.level ?? "");
  const targetPercent = Number(payload.targetPercent);
  const grade7Boundary = Number(payload.grade7Boundary);
  const upcomingComponentId = String(payload.upcomingComponentId ?? "").trim().slice(0, 60);
  const upcomingComponentName = String(payload.upcomingComponentName ?? "").trim().slice(0, 120);
  const upcomingWeight = Number(payload.upcomingWeight);
  if (!subjectId || !["SL", "HL"].includes(level) || !upcomingComponentId || !upcomingComponentName) return apiJson(request, { error: "Subject, level and upcoming component are required." }, { status: 400 });
  if (!safeJson<string[]>(profile.selectedSubjects, []).includes(subjectId) || safeJson<Record<string, string>>(profile.subjectLevels, {})[subjectId] !== level) return apiJson(request, { error: "Use a subject and level saved on your dashboard." }, { status: 400 });
  if (![targetPercent, grade7Boundary, upcomingWeight].every((value) => Number.isFinite(value) && value >= 1 && value <= 100)) return apiJson(request, { error: "Targets and weights must be between 1% and 100%." }, { status: 400 });
  const now = new Date().toISOString();
  const [existing] = await db.select().from(gradeGoals).where(and(eq(gradeGoals.userEmail, user.email), eq(gradeGoals.subjectId, subjectId), eq(gradeGoals.level, level))).limit(1);
  const values = { targetPercent: Math.round(targetPercent), grade7Boundary: Math.round(grade7Boundary), upcomingComponentId, upcomingComponentName, upcomingWeight: Math.round(upcomingWeight), updatedAt: now };
  const [goal] = existing
    ? await db.update(gradeGoals).set(values).where(eq(gradeGoals.id, existing.id)).returning()
    : await db.insert(gradeGoals).values({ userEmail: user.email, subjectId, level, ...values }).returning();
  return apiJson(request, { goal });
}
