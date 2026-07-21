import test from "node:test";
import assert from "node:assert/strict";
import { assessmentComponents, gradeSummary } from "../app/grade-planning.ts";

test("officially weighted core course presets total 100 percent", () => {
  for (const subjectId of ["math", "math-ai", "physics", "biology", "chemistry", "economics", "business", "geography", "history", "english-a", "english-b"]) {
    for (const level of ["SL", "HL"]) {
      const components = assessmentComponents(subjectId, level);
      assert.equal(components.reduce((sum, component) => sum + component.weight, 0), 100, `${subjectId} ${level} weights do not total 100`);
      assert.equal(new Set(components.map((component) => component.id)).size, components.length, `${subjectId} ${level} repeats a component`);
    }
  }
});

test("weighted average keeps assessment score separate from final-grade weight", () => {
  const summary = gradeSummary([
    { percent: 80, assessmentWeight: 30 },
    { percent: 60, assessmentWeight: 20 },
  ], 75, 30);
  assert.equal(summary.contribution, 36);
  assert.equal(summary.completedWeight, 50);
  assert.equal(summary.currentPercent, 72);
  assert.equal(summary.gap, 3);
  assert.equal(summary.requiredNext, 80);
});

test("planner reports when a one-assessment target requires more than 100 percent", () => {
  const summary = gradeSummary([{ percent: 40, assessmentWeight: 80 }], 75, 20);
  assert.equal(summary.currentPercent, 40);
  assert.equal(summary.requiredNext, 215);
});

test("planner handles a new learner without verified evidence", () => {
  assert.deepEqual(gradeSummary([], 75, 30), {
    contribution: 0, completedWeight: 0, currentPercent: null, gap: null, requiredNext: 75,
  });
});
