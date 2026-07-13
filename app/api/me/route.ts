import { desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { profiles, testAttempts } from "../../../db/schema";
import { requireApiUser, safeJson } from "../../server-auth";
import { apiJson, apiOptions } from "../../api-response";

export const OPTIONS = apiOptions;

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    if (!user) return apiJson(request, { error: "Sign in required" }, { status: 401 });
    await ensureSchema();
    const db = await getDb();
    await db.insert(profiles).values({ email: user.email, displayName: user.displayName }).onConflictDoUpdate({ target: profiles.email, set: { displayName: user.displayName, updatedAt: new Date().toISOString() } });
    const [profile] = await db.select().from(profiles).where(eq(profiles.email, user.email)).limit(1);
    const attempts = await db.select().from(testAttempts).where(eq(testAttempts.userEmail, user.email)).orderBy(desc(testAttempts.createdAt), desc(testAttempts.id)).limit(100);
    return apiJson(request, { user: { email: user.email, displayName: user.displayName, isAdmin: user.isAdmin }, premium: Boolean(profile?.premium), selectedSubjects: safeJson<string[]>(profile?.selectedSubjects ?? "[]", []), subjectLevels: safeJson<Record<string, "SL" | "HL">>(profile?.subjectLevels ?? "{}", {}), attempts: attempts.map((attempt) => ({ ...attempt, topicBreakdown: safeJson(attempt.topicBreakdown, []), criteriaBreakdown: safeJson(attempt.criteriaBreakdown, []), questionIds: safeJson(attempt.questionIds, []), difficultyTrail: safeJson(attempt.difficultyTrail, []), mistakes: safeJson(attempt.mistakes, []) })) });
  } catch (error) {
    console.error("Account initialization failed", error);
    return apiJson(request, { error: "Account storage is temporarily unavailable." }, { status: 500 });
  }
}
