import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { profiles } from "../../../../db/schema";
import { requireApiUser } from "../../../server-auth";
import { apiJson, apiOptions } from "../../../api-response";

export const OPTIONS = apiOptions;

const VALID_GRADES = new Set(["10", "11", "12"]);
const VALID_LANGUAGES = new Set(["en", "ko", "ja", "fr", "it", "zh"]);

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiJson(request, { error: "Sign in required" }, { status: 401 });
  const payload = await request.json() as { grade?: string; uiLanguage?: string };
  if (!payload.grade || !VALID_GRADES.has(payload.grade)) {
    return apiJson(request, { error: "Choose a valid grade (10, 11 or 12)." }, { status: 400 });
  }
  const uiLanguage = payload.uiLanguage && VALID_LANGUAGES.has(payload.uiLanguage) ? payload.uiLanguage : "en";
  await ensureSchema();
  const db = await getDb();
  await db.update(profiles).set({ grade: payload.grade, uiLanguage, updatedAt: new Date().toISOString() }).where(eq(profiles.email, user.email));
  return apiJson(request, { grade: payload.grade, uiLanguage });
}
