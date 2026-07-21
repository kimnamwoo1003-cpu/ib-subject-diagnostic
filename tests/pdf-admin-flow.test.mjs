import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("downloadable papers separate preparation, timed work and answer checking", async () => {
  const source = await readFile(new URL("app/diagnostic-client.tsx", root), "utf8");
  assert.match(source, /type Stage = .*"ready".*"paper".*"answers"/);
  assert.match(source, /Download PDF/);
  assert.match(source, /Start exam/);
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
