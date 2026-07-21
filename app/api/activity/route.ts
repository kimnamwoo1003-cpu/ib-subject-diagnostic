import { desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { userActivities } from "../../../db/schema";
import { requireApiUser, safeJson } from "../../server-auth";
import { apiJson, apiOptions } from "../../api-response";

export const OPTIONS = apiOptions;

const allowedActions = new Set(["subject_opened", "test_prepared", "pdf_downloaded", "test_started", "answer_entry_opened", "test_submitted"]);

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiJson(request, { error: "Login required" }, { status: 401 });
  const payload = await request.json() as { action?: string; subjectId?: string; level?: string; paperId?: string; detail?: Record<string, unknown> };
  if (!payload.action || !allowedActions.has(payload.action)) return apiJson(request, { error: "Invalid activity" }, { status: 400 });
  await ensureSchema();
  const db = await getDb();
  await db.insert(userActivities).values({
    userEmail: user.email,
    action: payload.action,
    subjectId: payload.subjectId?.slice(0, 80) || null,
    level: payload.level === "HL" ? "HL" : payload.level === "SL" ? "SL" : null,
    paperId: payload.paperId?.slice(0, 40) || null,
    detail: JSON.stringify(payload.detail ?? {}).slice(0, 2000),
  });
  return apiJson(request, { ok: true });
}

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiJson(request, { error: "Login required" }, { status: 401 });
  await ensureSchema();
  const db = await getDb();
  const rows = await db.select().from(userActivities).where(eq(userActivities.userEmail, user.email)).orderBy(desc(userActivities.createdAt)).limit(100);
  return apiJson(request, { activities: rows.map((row) => ({ ...row, detail: safeJson(row.detail, {}) })) });
}
