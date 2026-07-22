import { eq } from "drizzle-orm";
import { communityProfiles } from "../../../../../db/schema";
import { apiJson, apiOptions, corsHeaders } from "../../../../api-response";
import { requireCommunityUser } from "../../../../community-server";

export const OPTIONS = apiOptions;

const extensions: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function validSignature(bytes: Uint8Array, mime: string) {
  if (mime === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  if (mime === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return false;
}

export async function GET(request: Request) {
  const access = await requireCommunityUser(request); if ("response" in access) return access.response;
  const target = (new URL(request.url).searchParams.get("user") ?? access.user.email).trim().toLowerCase();
  const [profile] = await access.db.select({ avatarKey: communityProfiles.avatarKey }).from(communityProfiles).where(eq(communityProfiles.userEmail, target)).limit(1);
  if (!profile?.avatarKey) return new Response("Avatar not found", { status: 404, headers: corsHeaders(request) });
  const { env } = await import("cloudflare:workers");
  const object = await env.BUCKET?.get(profile.avatarKey);
  if (!object) return new Response("Avatar not found", { status: 404, headers: corsHeaders(request) });
  return new Response(object.body, { headers: { ...corsHeaders(request), "content-type": object.httpMetadata?.contentType ?? "image/jpeg", "cache-control": "private, max-age=900", "content-security-policy": "default-src 'none'" } });
}

export async function POST(request: Request) {
  const access = await requireCommunityUser(request); if ("response" in access) return access.response;
  const form = await request.formData(); const file = form.get("avatar");
  if (!(file instanceof File)) return apiJson(request, { error: "Choose a profile picture." }, { status: 400 });
  if (!extensions[file.type] || file.size < 100 || file.size > 2 * 1024 * 1024) return apiJson(request, { error: "Upload a PNG, JPEG or WebP image up to 2 MB." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validSignature(bytes, file.type)) return apiJson(request, { error: "The selected file is not a valid image." }, { status: 400 });
  const { env } = await import("cloudflare:workers");
  if (!env.BUCKET) return apiJson(request, { error: "Profile picture storage is unavailable." }, { status: 503 });
  const [current] = await access.db.select({ avatarKey: communityProfiles.avatarKey }).from(communityProfiles).where(eq(communityProfiles.userEmail, access.user.email)).limit(1);
  const avatarKey = `community-avatars/${encodeURIComponent(access.user.email)}/${crypto.randomUUID()}.${extensions[file.type]}`;
  await env.BUCKET.put(avatarKey, bytes, { httpMetadata: { contentType: file.type }, customMetadata: { user: access.user.email } });
  try {
    await access.db.insert(communityProfiles).values({ userEmail: access.user.email, avatarKey }).onConflictDoUpdate({ target: communityProfiles.userEmail, set: { avatarKey, updatedAt: new Date().toISOString() } });
    if (current?.avatarKey) await env.BUCKET.delete(current.avatarKey);
    return apiJson(request, { updated: true, avatarVersion: avatarKey });
  } catch (error) {
    await env.BUCKET.delete(avatarKey);
    throw error;
  }
}
