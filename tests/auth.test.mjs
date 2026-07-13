import assert from "node:assert/strict";
import test from "node:test";
import { createPasswordRecord, createRecoveryCode, normalizeRecoveryCode, normalizeUsername, validatePassword, validateRecoveryCode, validateUsername, verifyPassword } from "../app/password-auth.ts";
import { mergeSelectedSubjectLevel } from "../app/profile-level.ts";
import { ADMIN_USERNAME, isAdminUsername } from "../app/server-auth.ts";

test("only the exact site username justinnamwoo1003 receives admin", () => {
  assert.equal(ADMIN_USERNAME, "justinnamwoo1003");
  assert.equal(isAdminUsername("justinnamwoo1003"), true);
  assert.equal(isAdminUsername("JUSTINNAMWOO1003"), true);
  assert.equal(isAdminUsername("justinnamwoo10030"), false);
});

test("account credentials are normalized and validated", () => {
  assert.equal(normalizeUsername("  Student_01 "), "student_01");
  assert.equal(validateUsername("student_01"), null);
  assert.match(validateUsername("ab"), /3–24/);
  assert.equal(validatePassword("12345678"), null);
  assert.match(validatePassword("short"), /8/);
});

test("password records verify the right password without storing plaintext", async () => {
  const record = await createPasswordRecord("securepass123", "test-only-pepper");
  assert.notEqual(record.passwordHash, "securepass123");
  assert.equal(await verifyPassword("securepass123", record.passwordSalt, record.passwordHash, "test-only-pepper"), true);
  assert.equal(await verifyPassword("wrongpass123", record.passwordSalt, record.passwordHash, "test-only-pepper"), false);
});

test("recovery codes are high-entropy, normalized and verifiable without plaintext storage", async () => {
  const code = createRecoveryCode();
  assert.match(code, /^[A-HJ-NP-Z2-9]{5}(?:-[A-HJ-NP-Z2-9]{5}){3}$/);
  assert.equal(validateRecoveryCode(code), null);
  const normalized = normalizeRecoveryCode(code.toLowerCase());
  const record = await createPasswordRecord(normalized, "test-only-pepper");
  assert.notEqual(record.passwordHash, normalized);
  assert.equal(await verifyPassword(normalized, record.passwordSalt, record.passwordHash, "test-only-pepper"), true);
  assert.equal(await verifyPassword("WRONGRECOVERYCODE2345", record.passwordSalt, record.passwordHash, "test-only-pepper"), false);
});

test("changing one course level preserves all other saved subject levels", () => {
  const selected = ["physics", "math", "economics", "cs", "korean-a", "english-b"];
  const before = { physics: "SL", math: "HL", economics: "HL", cs: "SL", "korean-a": "SL", "english-b": "HL" };
  const after = mergeSelectedSubjectLevel(selected, before, "physics", "HL");
  assert.deepEqual(after, { ...before, physics: "HL" });
  assert.throws(() => mergeSelectedSubjectLevel(selected, before, "biology", "HL"));
});
