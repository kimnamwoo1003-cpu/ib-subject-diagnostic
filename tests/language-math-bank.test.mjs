import assert from "node:assert/strict";
import test from "node:test";
import { buildQuestionPool, getAssessmentCriteria, getLevelTopics, getPapers, getRelevantTopics, subjects } from "../app/data.ts";

const mathIds = ["math", "math-ai"];
const languageIds = ["english-a", "english-a-literature", "english-b", "french-a", "french-a-literature", "french-b", "japanese-a", "japanese-a-literature", "japanese-b", "korean-a", "korean-a-literature", "korean-b", "italian-a", "italian-a-literature", "italian-b", "chinese-a", "chinese-a-literature", "chinese-b"];

test("mathematics uses fine-grained nodes and respects AHL boundaries", () => {
  const aa = subjects.find((subject) => subject.id === "math");
  const ai = subjects.find((subject) => subject.id === "math-ai");
  assert.equal(getLevelTopics(aa, "SL").length, 17);
  assert.equal(getLevelTopics(aa, "HL").length, 21);
  assert.equal(getLevelTopics(ai, "SL").length, 17);
  assert.equal(getLevelTopics(ai, "HL").length, 26);
  for (const id of mathIds) {
    const subject = subjects.find((item) => item.id === id);
    assert.equal(getLevelTopics(subject, "SL").some((topic) => topic.level === "HL"), false);
  }
});

test("mathematics paper grammar and markscheme-first metadata are enforced", () => {
  for (const id of mathIds) {
    const subject = subjects.find((item) => item.id === id);
    for (const level of subject.levels) {
      for (const paper of getPapers(subject, level)) {
        const topics = getRelevantTopics(subject, level, paper);
        const pool = buildQuestionPool(subject, level, paper, topics.slice(0, 4), true, "python", 20260713, []);
        assert.ok(pool.length >= 72);
        assert.equal(new Set(pool.map((question) => question.id)).size, pool.length);
        for (const question of pool) {
          assert.ok(question.syllabusPath?.startsWith(question.topicCode));
          assert.ok(question.syllabusProfile?.startsWith(id === "math" ? "MATH_AA" : "MATH_AI"));
          assert.ok(question.markschemePoints?.length >= 1);
          assert.ok(question.commonErrors?.length >= 3);
          assert.ok(question.estimatedMinutes >= 2);
          if (paper.id !== "concept") {
            if (id === "math" && paper.id === "p1") assert.match(question.context, /Technology is not permitted/);
            if (id === "math" && paper.id === "p2") assert.match(question.context, /Technology is allowed/);
            if (id === "math-ai") assert.match(question.context, /Technology is required/);
            if (paper.id === "p3") assert.match(question.prompt, /conjecture/);
          }
        }
      }
    }
  }
});

test("every mathematics node has its own matching task archetype", () => {
  const checks = {
    math: { "1.2": /prove|counterexample|divisible/i, "1.6": /complex|Argand|cube roots/i, "3.4": /line|plane|vector/i, "5.4": /dP\/dt|population|separate variables/i },
    "math-ai": { "1.2": /deposit|annuity|interest/i, "1.4": /polar|Argand|z=/i, "3.2": /Voronoi|service sites/i, "3.5": /network|spanning tree|Euler/i, "4.8": /transition matrix|steady-state|plans/i, "5.3": /Euler's method|dy\/dt/i },
  };
  for (const [id, nodes] of Object.entries(checks)) {
    const subject = subjects.find((item) => item.id === id);
    const paper = getPapers(subject, "HL").find((item) => item.id === "p2");
    const topics = getRelevantTopics(subject, "HL", paper);
    const pool = buildQuestionPool(subject, "HL", paper, topics, true, "python", 8, []);
    for (const [code, pattern] of Object.entries(nodes)) {
      const question = pool.find((item) => item.topicCode === code);
      assert.ok(question, `${id} ${code} missing`);
      assert.match(`${question.context} ${question.prompt}`, pattern, `${id} ${code} uses the wrong archetype`);
    }
    const onePerNode = topics.map((topic) => pool.find((item) => item.topicCode === topic.code)?.context);
    assert.equal(new Set(onePerNode).size, topics.length, `${id} reuses a generic context across exact nodes`);
  }
});

test("language variants use correct paper nodes, criteria and target-language stimuli", () => {
  const targetSignals = { french: /[àéèêç]|bibliothèque|œuvres/i, japanese: /[ぁ-んァ-ヶ一-龯]/, korean: /[가-힣]/, italian: /[àèéìòù]|biblioteca|opere|scrivi|confronta/i, chinese: /[\u4e00-\u9fff]/ };
  for (const id of languageIds) {
    const subject = subjects.find((item) => item.id === id);
    assert.ok(subject, `missing ${id}`);
    for (const paper of getPapers(subject, "SL")) {
      const topics = getRelevantTopics(subject, "SL", paper);
      assert.ok(topics.length >= 4, `${id} ${paper.id} lacks fine-grained paper nodes`);
      assert.ok(topics.every((topic) => topic.code.startsWith(paper.id === "p2r" ? "P2" : paper.id.toUpperCase())));
      const pool = buildQuestionPool(subject, "SL", paper, topics.slice(0, 2), true, "python", 51, []);
      assert.ok(pool.length >= 40);
      for (const question of pool) {
        assert.ok(question.context?.trim().length >= 20);
        assert.ok(question.markschemePoints?.length);
        assert.ok(question.commonErrors?.length >= 3);
        assert.ok(question.criterionCodes?.length);
        assert.ok(question.syllabusProfile?.startsWith(id.endsWith("-b") ? "LANGUAGE_B" : "LANGUAGE_A"));
        const language = id.split("-")[0];
        if (language !== "english") assert.match(`${question.context} ${question.prompt}`, targetSignals[language]);
      }
      const criteria = getAssessmentCriteria(subject, paper);
      assert.equal(criteria.length, id.endsWith("-b") ? paper.id === "p1" ? 3 : 1 : 4);
    }
  }
});

test("live language questions do not expose model answers in prompts", () => {
  for (const id of ["english-a", "korean-b", "chinese-a-literature"]) {
    const subject = subjects.find((item) => item.id === id);
    const paper = getPapers(subject, "HL")[0];
    const topics = getRelevantTopics(subject, "HL", paper);
    const pool = buildQuestionPool(subject, "HL", paper, topics, true, "python", 9, []);
    for (const question of pool) {
      assert.ok(question.modelAnswer);
      assert.equal(question.prompt.includes(question.modelAnswer), false);
      assert.doesNotMatch(question.prompt, /According to the markscheme|model answer/i);
    }
  }
});
