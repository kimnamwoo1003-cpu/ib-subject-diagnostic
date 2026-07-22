import { desc, eq } from "drizzle-orm";
import { communityNotifications } from "../../../../db/schema";
import { apiJson, apiOptions } from "../../../api-response";
import { requireCommunityUser } from "../../../community-server";

export const OPTIONS = apiOptions;
export async function GET(request: Request) { const access = await requireCommunityUser(request); if ("response" in access) return access.response; const rows = await access.db.select().from(communityNotifications).where(eq(communityNotifications.userEmail, access.user.email)).orderBy(desc(communityNotifications.createdAt)).limit(50); return apiJson(request, { notifications: rows }); }
export async function PATCH(request: Request) { const access = await requireCommunityUser(request); if ("response" in access) return access.response; const payload = await request.json() as { id?: number; all?: boolean }; if (payload.all) await access.db.update(communityNotifications).set({ read: true }).where(eq(communityNotifications.userEmail, access.user.email)); else if (payload.id) await access.db.update(communityNotifications).set({ read: true }).where(eq(communityNotifications.id, Number(payload.id))); else return apiJson(request, { error: "Choose a notification." }, { status: 400 }); return apiJson(request, { updated: true }); }
