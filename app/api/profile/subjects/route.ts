import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { profiles } from "../../../../db/schema";
import { subjectCatalog } from "../../../data";
import { requireApiUser } from "../../../server-auth";
import { apiJson, apiOptions } from "../../../api-response";

export const OPTIONS = apiOptions;

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiJson(request, { error: "Sign in required" }, { status: 401 });
  const payload = await request.json() as { subjects?: string[] };
  const subjects = Array.from(new Set(payload.subjects ?? []));
  const validIds = new Set(subjectCatalog.map((subject) => subject.id));
  if (subjects.length !== 6 || subjects.some((id) => !validIds.has(id))) {
    return apiJson(request, { error: "Choose exactly six valid IB subjects." }, { status: 400 });
  }
  await ensureSchema();
  const db = await getDb();
  await db.update(profiles).set({ selectedSubjects: JSON.stringify(subjects), updatedAt: new Date().toISOString() }).where(eq(profiles.email, user.email));
  return apiJson(request, { selectedSubjects: subjects });
}
