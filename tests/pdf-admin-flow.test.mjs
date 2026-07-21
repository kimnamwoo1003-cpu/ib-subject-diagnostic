import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("paper and MCQ tests support both online and PDF delivery", async () => {
  const source = await readFile(new URL("app/diagnostic-client.tsx", root), "utf8");
  assert.match(source, /type Stage = .*"ready".*"paper".*"answers"/);
  assert.match(source, /type DeliveryMode = "online" \| "pdf"/);
  assert.match(source, /Take online/);
  assert.match(source, /Use PDF/);
  assert.match(source, /Start online exam/);
  assert.match(source, /Start PDF exam/);
  assert.match(source, /Download PDF/);
  assert.match(source, /setStage\(nextMode === "pdf" \? "paper" : "test"\)/);
  assert.match(source, /deliveryMode: nextMode/);
  assert.match(source, /I finished — enter answers/);
  assert.match(source, /Check answers & finish/);
  assert.match(source, /setStartedAt\(Date\.now\(\)\)/);
  assert.match(source, /downloadable-question-paper/);
  assert.doesNotMatch(source, /Markscheme requirements[\s\S]{0,400}pdf-question/);
});

test("science and mathematics answer entry provides a symbol palette", async () => {
  const source = await readFile(new URL("app/diagnostic-client.tsx", root), "utf8");
  for (const symbol of ["√", "π", "θ", "Δ", "Σ", "∫", "≤", "≥", "Ω"]) assert.ok(source.includes(`"${symbol}"`));
  assert.match(source, /subject\.group === "Sciences" \|\| subject\.group === "Mathematics"/);
});

test("admin data combines attempts, activity events and payment review", async () => {
  const [route, client, schema] = await Promise.all([
    readFile(new URL("app/api/admin/users/route.ts", root), "utf8"),
    readFile(new URL("app/admin/admin-client.tsx", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
  ]);
  assert.match(route, /testAttempts/);
  assert.match(route, /userActivities/);
  assert.match(route, /premiumRequests/);
  assert.match(client, /Student progress/);
  assert.match(client, /Accept payment & activate/);
  assert.match(schema, /user_activities/);
  assert.match(schema, /premium_requests/);
});

test("grade evidence requires Premium, private object storage and manual admin review", async () => {
  const [studentRoute, adminRoute, hosting, schema] = await Promise.all([
    readFile(new URL("app/api/grades/route.ts", root), "utf8"),
    readFile(new URL("app/api/admin/grades/route.ts", root), "utf8"),
    readFile(new URL(".openai/hosting.json", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
  ]);
  assert.match(studentRoute, /Premium access required/);
  assert.match(studentRoute, /SHA-256/);
  assert.match(studentRoute, /This screenshot has already been submitted/);
  assert.match(studentRoute, /env\.BUCKET\.put/);
  assert.match(adminRoute, /user\?\.isAdmin/);
  assert.match(adminRoute, /status: payload\.decision === "verify" \? "verified" : "rejected"/);
  assert.equal(JSON.parse(hosting).r2, "BUCKET");
  assert.match(schema, /grade_evidence/);
  assert.match(schema, /grade_goals/);
});
