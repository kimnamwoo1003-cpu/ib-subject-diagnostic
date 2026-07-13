import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { profiles } from "../../../../db/schema";
import { subjectCatalog } from "../../../data";
import { apiJson, apiOptions } from "../../../api-response";
import { requireApiUser, safeJson } from "../../../server-auth";
import { mergeSelectedSubjectLevel } from "../../../profile-level";

export const OPTIONS = apiOptions;

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiJson(request, { error: "Sign in required" }, { status: 401 });
  const payload = await request.json() as { subjectId?: string; level?: string };
  const course = subjectCatalog.find((subject) => subject.id === payload.subjectId);
  if (!course || (payload.level !== "SL" && payload.level !== "HL") || !course.levels.includes(payload.level)) {
    return apiJson(request, { error: "Choose a valid SL or HL level for this subject." }, { status: 400 });
  }

  await ensureSchema();
  const db = await getDb();
  const [profile] = await db.select({ selectedSubjects: profiles.selectedSubjects, subjectLevels: profiles.subjectLevels }).from(profiles).where(eq(profiles.email, user.email)).limit(1);
  const selectedSubjects = safeJson<string[]>(profile?.selectedSubjects ?? "[]", []);
  if (!selectedSubjects.includes(course.id)) return apiJson(request, { error: "This subject is not in your selected six." }, { status: 400 });
  const subjectLevels = mergeSelectedSubjectLevel(selectedSubjects, safeJson<Record<string, "SL" | "HL">>(profile?.subjectLevels ?? "{}", {}), course.id, payload.level);
  await db.update(profiles).set({ subjectLevels: JSON.stringify(subjectLevels), updatedAt: new Date().toISOString() }).where(eq(profiles.email, user.email));
  return apiJson(request, { subjectId: course.id, level: payload.level, subjectLevels });
}
