import { and, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { gradeEvidence } from "../../../../db/schema";
import { corsHeaders } from "../../../api-response";
import { requireApiUser } from "../../../server-auth";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return new Response("Sign in required", { status: 401, headers: corsHeaders(request) });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return new Response("Invalid evidence id", { status: 400, headers: corsHeaders(request) });
  await ensureSchema();
  const db = await getDb();
  const [record] = await db.select().from(gradeEvidence).where(and(eq(gradeEvidence.id, id), eq(gradeEvidence.userEmail, user.email))).limit(1);
  if (!record) return new Response("Evidence not found", { status: 404, headers: corsHeaders(request) });
  const { env } = await import("cloudflare:workers");
  const object = await env.BUCKET?.get(record.evidenceKey);
  if (!object) return new Response("Evidence not found", { status: 404, headers: corsHeaders(request) });
  return new Response(object.body, { headers: { ...corsHeaders(request), "content-type": record.evidenceMime, "cache-control": "private, no-store", "content-disposition": `inline; filename="evidence-${record.id}.${record.evidenceMime.split("/")[1]}"` } });
}
