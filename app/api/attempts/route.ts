import { desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { profiles, testAttempts } from "../../../db/schema";
import { requireApiUser, safeJson } from "../../server-auth";

type AttemptPayload = {
  subjectId?: string; subjectName?: string; level?: string; paperId?: string; paperName?: string;
  mode?: "diagnostic" | "monthly"; percent?: number; grade?: number; durationSeconds?: number;
  topicBreakdown?: unknown[]; criteriaBreakdown?: unknown[]; questionIds?: string[]; difficultyTrail?: string[]; mistakes?: unknown[];
};

export async function GET() {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  await ensureSchema();
  const db = await getDb();
  const rows = await db.select().from(testAttempts).where(eq(testAttempts.userEmail, user.email)).orderBy(desc(testAttempts.createdAt), desc(testAttempts.id)).limit(100);
  return Response.json({ attempts: rows.map((row) => ({ ...row, topicBreakdown: safeJson(row.topicBreakdown, []), mistakes: safeJson(row.mistakes, []) })) });
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  const payload = await request.json() as AttemptPayload;
  if (!payload.subjectId || !payload.subjectName || !payload.level || !payload.paperId || !payload.paperName || !payload.mode) {
    return Response.json({ error: "Incomplete attempt data" }, { status: 400 });
  }
  const percent = Math.max(0, Math.min(100, Math.round(Number(payload.percent) || 0)));
  const grade = Math.max(1, Math.min(7, Math.round(Number(payload.grade) || 1)));
  await ensureSchema();
  const db = await getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.email, user.email)).limit(1);
  if (payload.mode === "monthly" && !profile?.premium) {
    return Response.json({ error: "Premium access required" }, { status: 403 });
  }
  if (!profile?.premium) {
    const existing = await db.select({ id: testAttempts.id }).from(testAttempts).where(eq(testAttempts.userEmail, user.email)).limit(1);
    if (existing.length) return Response.json({ error: "Free accounts can complete one test only. Premium access is required for another attempt." }, { status: 403 });
  }
  const [attempt] = await db.insert(testAttempts).values({
    userEmail: user.email,
    subjectId: payload.subjectId,
    subjectName: payload.subjectName,
    level: payload.level,
    paperId: payload.paperId,
    paperName: payload.paperName,
    mode: payload.mode,
    percent,
    grade,
    durationSeconds: Math.max(0, Math.round(Number(payload.durationSeconds) || 0)),
    topicBreakdown: JSON.stringify(payload.topicBreakdown ?? []),
    criteriaBreakdown: JSON.stringify(payload.criteriaBreakdown ?? []),
    questionIds: JSON.stringify(payload.questionIds ?? []),
    difficultyTrail: JSON.stringify(payload.difficultyTrail ?? []),
    mistakes: JSON.stringify(payload.mistakes ?? []),
  }).returning();
  return Response.json({ attempt }, { status: 201 });
}
