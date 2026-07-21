import { desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { gradeEvidence, gradeGoals, profiles } from "../../../db/schema";
import { gradeSummary } from "../../grade-planning";
import { apiJson, apiOptions } from "../../api-response";
import { requireApiUser, safeJson } from "../../server-auth";

export const OPTIONS = apiOptions;

const platforms = new Set(["managebac", "toddle", "google-classroom", "microsoft-teams", "canvas", "moodle"]);
const mimeExtensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

async function requirePremium(request: Request) {
  const user = await requireApiUser();
  if (!user) return { error: apiJson(request, { error: "Sign in required" }, { status: 401 }) };
  await ensureSchema();
  const db = await getDb();
  const [profile] = await db.select({ premium: profiles.premium, selectedSubjects: profiles.selectedSubjects, subjectLevels: profiles.subjectLevels }).from(profiles).where(eq(profiles.email, user.email)).limit(1);
  if (!profile?.premium) return { error: apiJson(request, { error: "Premium access required" }, { status: 403 }) };
  return { user, db, profile };
}

function validImageSignature(bytes: Uint8Array, mime: string) {
  if (mime === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  if (mime === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return false;
}

function latestPerComponent<T extends { componentId: string }>(rows: T[]) {
  const seen = new Set<string>();
  return rows.filter((row) => seen.has(row.componentId) ? false : (seen.add(row.componentId), true));
}

export async function GET(request: Request) {
  try {
    const access = await requirePremium(request);
    if ("error" in access) return access.error;
    const { user, db } = access;
    const [records, goals, verified, premiumProfiles] = await Promise.all([
      db.select().from(gradeEvidence).where(eq(gradeEvidence.userEmail, user.email)).orderBy(desc(gradeEvidence.createdAt), desc(gradeEvidence.id)).limit(200),
      db.select().from(gradeGoals).where(eq(gradeGoals.userEmail, user.email)),
      db.select().from(gradeEvidence).where(eq(gradeEvidence.status, "verified")).orderBy(desc(gradeEvidence.createdAt), desc(gradeEvidence.id)).limit(5000),
      db.select({ email: profiles.email }).from(profiles).where(eq(profiles.premium, true)),
    ]);
    const goalMap = new Map(goals.map((goal) => [`${goal.subjectId}:${goal.level}`, goal]));
    const premiumEmails = new Set(premiumProfiles.map((profile) => profile.email));
    const ownKeys = new Set(records.map((row) => `${row.subjectId}:${row.level}`));
    goals.forEach((goal) => ownKeys.add(`${goal.subjectId}:${goal.level}`));
    const summaries = [...ownKeys].map((key) => {
      const [subjectId, level] = key.split(":");
      const goal = goalMap.get(key);
      const ownVerified = latestPerComponent(records.filter((row) => row.status === "verified" && row.subjectId === subjectId && row.level === level));
      const targetPercent = goal?.targetPercent ?? 75;
      const grade7Boundary = goal?.grade7Boundary ?? 75;
      const upcomingWeight = goal?.upcomingWeight ?? 20;
      const summary = gradeSummary(ownVerified, targetPercent, upcomingWeight);
      const sevenSummary = gradeSummary(ownVerified, grade7Boundary, upcomingWeight);
      const cohort = [...premiumEmails].map((email) => {
        const rows = latestPerComponent(verified.filter((row) => row.userEmail === email && row.subjectId === subjectId && row.level === level));
        const score = gradeSummary(rows, targetPercent, upcomingWeight).currentPercent;
        return score === null ? null : { email, score };
      }).filter((row): row is { email: string; score: number } => Boolean(row)).sort((a, b) => b.score - a.score);
      const rankIndex = cohort.findIndex((entry) => entry.email === user.email);
      return {
        subjectId, level, goal: goal ?? null, ...summary,
        requiredForSeven: sevenSummary.requiredNext,
        verifiedComponents: ownVerified.length,
        rank: cohort.length >= 3 && rankIndex >= 0 ? rankIndex + 1 : null,
        cohortSize: cohort.length,
      };
    });
    return apiJson(request, {
      records: records.map((row) => ({ ...row, automatedChecks: safeJson(row.automatedChecks, []) })),
      goals,
      summaries,
    });
  } catch (error) {
    return apiJson(request, { error: error instanceof Error ? error.message : "Grade data unavailable" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requirePremium(request);
  if ("error" in access) return access.error;
  const { user, db } = access;
  const form = await request.formData();
  const file = form.get("evidence");
  const sourcePlatform = String(form.get("sourcePlatform") ?? "");
  const subjectId = String(form.get("subjectId") ?? "").trim();
  const level = String(form.get("level") ?? "");
  const componentId = String(form.get("componentId") ?? "").trim().slice(0, 60);
  const componentName = String(form.get("componentName") ?? "").trim().slice(0, 120);
  const scoreEarned = Number(form.get("scoreEarned"));
  const scorePossible = Number(form.get("scorePossible"));
  const assessmentWeight = Number(form.get("assessmentWeight"));
  const assessmentDate = String(form.get("assessmentDate") ?? "");
  const selectedSubjects = safeJson<string[]>(access.profile.selectedSubjects, []);
  const subjectLevels = safeJson<Record<string, string>>(access.profile.subjectLevels, {});
  if (!(file instanceof File)) return apiJson(request, { error: "A screenshot is required." }, { status: 400 });
  if (!platforms.has(sourcePlatform)) return apiJson(request, { error: "Choose a supported school platform." }, { status: 400 });
  if (!subjectId || !componentId || !componentName || !["SL", "HL"].includes(level)) return apiJson(request, { error: "Subject, level and assessment component are required." }, { status: 400 });
  if (!selectedSubjects.includes(subjectId) || subjectLevels[subjectId] !== level) return apiJson(request, { error: "Use a subject and level saved on your dashboard." }, { status: 400 });
  if (!Number.isFinite(scoreEarned) || !Number.isFinite(scorePossible) || scorePossible <= 0 || scoreEarned < 0 || scoreEarned > scorePossible) return apiJson(request, { error: "Enter a valid score and maximum mark." }, { status: 400 });
  if (!Number.isFinite(assessmentWeight) || assessmentWeight < 1 || assessmentWeight > 100) return apiJson(request, { error: "Assessment weight must be between 1% and 100%." }, { status: 400 });
  const today = new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(assessmentDate) || assessmentDate > today || assessmentDate < "2020-01-01") return apiJson(request, { error: "Enter a plausible assessment date." }, { status: 400 });
  if (!mimeExtensions[file.type] || file.size < 500 || file.size > 8 * 1024 * 1024) return apiJson(request, { error: "Upload a PNG, JPEG or WebP screenshot up to 8 MB." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validImageSignature(bytes, file.type)) return apiJson(request, { error: "The file contents do not match its image format." }, { status: 400 });
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const evidenceHash = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  const [duplicate] = await db.select({ id: gradeEvidence.id, userEmail: gradeEvidence.userEmail, status: gradeEvidence.status, evidenceKey: gradeEvidence.evidenceKey }).from(gradeEvidence).where(eq(gradeEvidence.evidenceHash, evidenceHash)).limit(1);
  const rejectedRetry = duplicate?.userEmail === user.email && duplicate.status === "rejected";
  if (duplicate && !rejectedRetry) return apiJson(request, { error: "This screenshot has already been submitted. Upload the original record for this assessment only once." }, { status: 409 });
  const percent = Math.round(scoreEarned / scorePossible * 100);
  const automatedChecks = [
    { key: "file-signature", label: "Image file signature matches the declared format", passed: true },
    { key: "score-arithmetic", label: "Entered score and percentage are mathematically consistent", passed: true },
    { key: "date", label: "Assessment date is not in the future", passed: true },
    { key: "duplicate", label: rejectedRetry ? "Previously rejected evidence was resubmitted and needs careful comparison" : "No identical screenshot exists in the evidence store", passed: !rejectedRetry },
  ];
  const { env } = await import("cloudflare:workers");
  if (!env.BUCKET) return apiJson(request, { error: "Evidence storage is not configured yet." }, { status: 503 });
  const evidenceKey = rejectedRetry ? duplicate!.evidenceKey : `grade-evidence/${encodeURIComponent(user.email)}/${crypto.randomUUID()}.${mimeExtensions[file.type]}`;
  if (!rejectedRetry) await env.BUCKET.put(evidenceKey, bytes, { httpMetadata: { contentType: file.type }, customMetadata: { user: user.email, subjectId, componentId } });
  try {
    const [record] = await db.insert(gradeEvidence).values({
      userEmail: user.email, subjectId, level, componentId, componentName, sourcePlatform,
      scoreEarned, scorePossible, percent, assessmentWeight: Math.round(assessmentWeight), assessmentDate,
      evidenceKey, evidenceHash, evidenceMime: file.type, evidenceSize: file.size,
      originalFilename: file.name.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 120),
      status: "pending", automatedChecks: JSON.stringify(automatedChecks), updatedAt: new Date().toISOString(),
    }).returning();
    return apiJson(request, { record: { ...record, automatedChecks } }, { status: 201 });
  } catch (error) {
    if (!rejectedRetry) await env.BUCKET.delete(evidenceKey);
    throw error;
  }
}
