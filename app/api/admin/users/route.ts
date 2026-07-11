import { asc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { profiles } from "../../../../db/schema";
import { requireApiUser, safeJson } from "../../../server-auth";

export async function GET() {
  try {
    const user = await requireApiUser();
    if (!user?.isAdmin) return Response.json({ error: "Admin access required" }, { status: 403 });
    await ensureSchema();
    const db = await getDb();
    const rows = await db.select().from(profiles).orderBy(asc(profiles.displayName), asc(profiles.email));
    return Response.json({ users: rows.map((row) => ({ ...row, selectedSubjects: safeJson(row.selectedSubjects, []) })) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Admin data unavailable" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireApiUser();
  if (!user?.isAdmin) return Response.json({ error: "Admin access required" }, { status: 403 });
  const payload = await request.json() as { email?: string; premium?: boolean };
  if (!payload.email || typeof payload.premium !== "boolean") return Response.json({ error: "Email and premium status are required" }, { status: 400 });
  await ensureSchema();
  const db = await getDb();
  const [updated] = await db.update(profiles).set({ premium: payload.premium, updatedAt: new Date().toISOString() }).where(eq(profiles.email, payload.email)).returning();
  if (!updated) return Response.json({ error: "Account not found" }, { status: 404 });
  return Response.json({ user: { ...updated, selectedSubjects: safeJson(updated.selectedSubjects, []) } });
}
