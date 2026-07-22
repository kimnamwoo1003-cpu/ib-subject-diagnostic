import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Premium community has expected member features and server gates", async () => {
  const [client, server, admin] = await Promise.all([
    readFile(new URL("../app/community-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/community-server.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/community-admin.tsx", import.meta.url), "utf8"),
  ]);
  for (const feature of ["Start a discussion", "Bookmarks", "My posts", "Notifications", "Report", "Follow", "Share", "Reply"]) assert.match(client, new RegExp(feature, "i"));
  assert.match(server, /profile\?\.premium/);
  for (const action of ["Suspend 1 day", "30 days", "Permanent ban", "Reinstate"]) assert.match(admin, new RegExp(action, "i"));
});

test("grade upload uses an English custom control instead of a visible native input", async () => {
  const [tracker, css] = await Promise.all([readFile(new URL("../app/grade-tracker.tsx", import.meta.url), "utf8"), readFile(new URL("../app/globals.css", import.meta.url), "utf8")]);
  assert.match(tracker, /Choose screenshot/);
  assert.match(tracker, /No file selected/);
  assert.match(tracker, /className="custom-file-input"/);
  assert.match(css, /\.custom-file-input\{[^}]*opacity:0/);
});

test("deleted community content never reappears for its author or an administrator", async () => {
  const { canShowCommunityItem } = await import("../app/community-visibility.ts");
  assert.equal(canShowCommunityItem("deleted", false, false), false);
  assert.equal(canShowCommunityItem("deleted", true, false), false);
  assert.equal(canShowCommunityItem("deleted", false, true), false);
  assert.equal(canShowCommunityItem("visible", false, false), true);
  assert.equal(canShowCommunityItem("hidden", true, false), true);
  assert.equal(canShowCommunityItem("hidden", false, true), true);
});

test("community profiles support verified admin badges, nicknames and uploaded avatars", async () => {
  const [client, posts, profile, avatar, schema] = await Promise.all([
    readFile(new URL("../app/community-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/community/posts/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/community/profile/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/community/profile/avatar/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);
  assert.match(client, /admin-author-badge/);
  assert.match(client, /name="nickname"/);
  assert.match(client, /name="avatar"/);
  assert.match(posts, /isAdminUsername\(post\.authorEmail\)/);
  assert.match(profile, /nickname/);
  assert.match(avatar, /community-avatars/);
  assert.match(schema, /avatarKey/);
});
