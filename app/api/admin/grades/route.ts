import { desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { gradeEvidence } from "../../../../db/schema";
import { apiJson, apiOptions, corsHeaders } from "../../../api-response";
import { requireApiUser, safeJson } from "../../../server-auth";

export const OPTIONS = apiOptions;

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user?.isAdmin) return apiJson(request, { error: "Admin access required" }, { status: 403 });
  await ensureSchema();
  const db = await getDb();
  const evidenceId = Number(new URL(request.url).searchParams.get("evidence"));
  if (Number.isInteger(evidenceId) && evidenceId > 0) {
    const [record] = await db.select().from(gradeEvidence).where(eq(gradeEvidence.id, evidenceId)).limit(1);
    if (!record) return new Response("Evidence not found", { status: 404, headers: corsHeaders(request) });
    const { env } = await import("cloudflare:workers");
    const object = await env.BUCKET?.get(record.evidenceKey);
    if (!object) return new Response("Evidence not found", { status: 404, headers: corsHeaders(request) });
    return new Response(object.body, { headers: { ...corsHeaders(request), "content-type": record.evidenceMime, "cache-control": "private, no-store", "content-disposition": `inline; filename="evidence-${record.id}.${record.evidenceMime.split("/")[1]}"` } });
  }
  const records = await db.select().from(gradeEvidence).orderBy(desc(gradeEvidence.createdAt), desc(gradeEvidence.id)).limit(500);
  return apiJson(request, { records: records.map((row) => ({ ...row, automatedChecks: safeJson(row.automatedChecks, []) })) });
}

export async function PATCH(request: Request) {
  const user = await requireApiUser();
  if (!user?.isAdmin) return apiJson(request, { error: "Admin access required" }, { status: 403 });
  const payload = await request.json() as { id?: number; decision?: "verify" | "reject"; adminNote?: string };
  if (!Number.isInteger(payload.id) || !["verify", "reject"].includes(payload.decision ?? "")) return apiJson(request, { error: "Evidence id and review decision are required." }, { status: 400 });
  await ensureSchema();
  const db = await getDb();
  const [record] = await db.select().from(gradeEvidence).where(eq(gradeEvidence.id, payload.id!)).limit(1);
  if (!record) return apiJson(request, { error: "Evidence record not found." }, { status: 404 });
  if (record.status !== "pending") return apiJson(request, { error: "This evidence has already been reviewed." }, { status: 409 });
  if (payload.decision === "reject" && !String(payload.adminNote ?? "").trim()) return apiJson(request, { error: "Add a reason before rejecting evidence." }, { status: 400 });
  const reviewedAt = new Date().toISOString();
  const [updated] = await db.update(gradeEvidence).set({
    status: payload.decision === "verify" ? "verified" : "rejected",
    adminNote: String(payload.adminNote ?? "").trim().slice(0, 500),
    reviewedBy: user.email, reviewedAt, updatedAt: reviewedAt,
  }).where(eq(gradeEvidence.id, record.id)).returning();
  return apiJson(request, { record: { ...updated, automatedChecks: safeJson(updated.automatedChecks, []) } });
}
