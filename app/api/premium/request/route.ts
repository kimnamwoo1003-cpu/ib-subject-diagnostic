import { and, desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../../db";
import { premiumRequests, profiles } from "../../../../db/schema";
import { apiJson, apiOptions } from "../../../api-response";
import { validatePremiumRequest } from "../../../premium-request";
import { requireApiUser } from "../../../server-auth";

export const OPTIONS = apiOptions;

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiJson(request, { error: "Sign in required" }, { status: 401 });
  const validation = validatePremiumRequest(await request.json());
  if ("error" in validation) return apiJson(request, { error: validation.error }, { status: 400 });
  await ensureSchema();
  const db = await getDb();
  const [profile] = await db.select({ premium: profiles.premium }).from(profiles).where(eq(profiles.email, user.email)).limit(1);
  if (profile?.premium) return apiJson(request, { error: "This account already has Premium access." }, { status: 409 });
  const [pending] = await db.select({ id: premiumRequests.id }).from(premiumRequests)
    .where(and(eq(premiumRequests.userEmail, user.email), eq(premiumRequests.status, "pending")))
    .orderBy(desc(premiumRequests.createdAt), desc(premiumRequests.id)).limit(1);
  if (pending) return apiJson(request, { error: "A Premium payment review is already pending for this account." }, { status: 409 });
  const [premiumRequest] = await db.insert(premiumRequests).values({
    userEmail: user.email,
    ...validation.value,
  }).returning();
  return apiJson(request, { premiumRequest }, { status: 201 });
}
