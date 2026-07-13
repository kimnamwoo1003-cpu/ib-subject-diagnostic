import assert from "node:assert/strict";
import test from "node:test";
import { buildQuestionPool, getLevelTopics, getPapers, getRelevantTopics, subjects } from "../app/data.ts";

const scienceIds = ["biology", "chemistry", "physics", "cs", "design-technology", "ess", "sehs"];
const approvedCommands = new Set(["Analyse", "Calculate", "Construct", "Deduce", "Describe", "Determine", "Discuss", "Evaluate", "Explain", "Identify", "Recommend", "Trace"]);

test("science nodes respect SL and HL boundaries", () => {
  for (const id of scienceIds) {
    const subject = subjects.find((item) => item.id === id);
    assert.ok(subject, `missing ${id}`);
    const sl = getLevelTopics(subject, "SL");
    const hl = getLevelTopics(subject, "HL");
    assert.ok(sl.length >= 15, `${id} needs fine-grained SL nodes`);
    assert.ok(hl.length >= sl.length, `${id} HL coverage must include SL`);
    assert.equal(sl.some((topic) => topic.level === "HL"), false, `${id} exposes HL-only node in SL`);
  }
});

test("every generated science item passes structural quality control", () => {
  for (const id of scienceIds) {
    const subject = subjects.find((item) => item.id === id);
    for (const level of subject.levels) {
      for (const paper of getPapers(subject, level)) {
        const topics = getRelevantTopics(subject, level, paper);
        const questions = buildQuestionPool(subject, level, paper, topics, true, "python", 20260713, []);
        assert.ok(questions.length >= topics.length * 10, `${id} ${level} ${paper.id} pool is too small`);
        assert.equal(new Set(questions.map((question) => question.id)).size, questions.length, `${id} ${paper.id} has duplicate IDs`);
        for (const question of questions) {
          assert.ok(topics.some((topic) => topic.code === question.topicCode), `${question.id} is outside selected range`);
          assert.ok(question.context?.trim(), `${question.id} lacks a complete stimulus`);
          assert.ok(question.prompt.trim().length >= 35, `${question.id} prompt is underspecified`);
          assert.ok(question.syllabusPath?.startsWith(question.topicCode), `${question.id} lacks exact syllabus path`);
          assert.ok(question.syllabusProfile, `${question.id} lacks syllabus profile`);
          assert.ok(approvedCommands.has(question.commandTerm), `${question.id} uses an uncontrolled command term`);
          assert.ok(question.marks >= 1 && question.marks <= 12, `${question.id} mark allocation is implausible`);
          assert.ok(question.estimatedMinutes >= 2, `${question.id} lacks time calibration`);
          assert.ok(question.markschemePoints?.length, `${question.id} lacks markscheme-first points`);
          assert.ok(question.commonErrors?.length >= 3, `${question.id} lacks misconception validation`);
          assert.ok(question.keywords.length >= 3, `${question.id} lacks fine-grained concept tags`);
          assert.doesNotMatch(question.prompt, /Which statement best represents|Apply .* to apply|human error/i, `${question.id} contains a generic or invalid demand`);
          if (question.responseType === "mcq") {
            assert.equal(question.marks, 1, `${question.id} MCQ must be one mark`);
            assert.equal(question.choices?.length, 4, `${question.id} MCQ must have four options`);
            assert.equal(new Set(question.choices).size, 4, `${question.id} MCQ distractors repeat`);
            assert.ok(Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex < 4, `${question.id} answer key invalid`);
          }
          if (id === "cs" && paper.id === "p2") {
            assert.equal(question.responseType, "code", `${question.id} CS Paper 2 must accept code`);
            assert.ok(question.starterCode, `${question.id} CS Paper 2 lacks an editor scaffold`);
          }
          if (["biology", "chemistry", "physics", "sehs"].includes(id) && paper.id === "p1a") {
            assert.equal(question.responseType, "mcq", `${question.id} Paper 1A grammar mismatch`);
          }
        }
      }
    }
  }
});
