import test from "node:test";
import assert from "node:assert/strict";
import { activeSanction } from "../app/account-status.ts";
import { COMMUNITY_CATEGORIES, moderateCommunityText } from "../app/community-moderation.ts";

test("clean IB discussion remains visible", () => {
  const result = moderateCommunityText("Economics Paper 1 structure", "How do you organise evaluation when the question asks you to discuss a policy?");
  assert.equal(result.severity, "none");
  assert.equal(result.moderationState, "clean");
  assert.equal(COMMUNITY_CATEGORIES.some((category) => category.id === "off-topic"), true);
});

test("abuse is flagged and a credible threat is blocked", () => {
  assert.equal(moderateCommunityText("Reply", "You are a fucking idiot").severity, "review");
  assert.equal(moderateCommunityText("Listen", "I will kill you after school").severity, "block");
});

test("privacy and spam signals reach the admin queue", () => {
  assert.equal(moderateCommunityText("Contact", "Email me at learner@example.com").severity, "review");
  assert.equal(moderateCommunityText("Links", "https://a.test https://b.test https://c.test https://d.test").severity, "review");
});

test("temporary and permanent account sanctions are resolved safely", () => {
  const now = new Date("2026-07-22T00:00:00.000Z");
  assert.equal(activeSanction({ accountStatus: "suspended", suspendedUntil: "2026-07-23T00:00:00.000Z", suspensionReason: "Review" }, now)?.kind, "suspended");
  assert.equal(activeSanction({ accountStatus: "suspended", suspendedUntil: "2026-07-21T00:00:00.000Z" }, now), null);
  assert.equal(activeSanction({ accountStatus: "banned", suspensionReason: "Repeated threats" }, now)?.kind, "banned");
});
