import test from "node:test";
import assert from "node:assert/strict";
import { buildQuestionPool, buildUniqueQuestionPool, getPapers, getRelevantTopics, subjects } from "../app/data.ts";
import { buildTestPlan, isSingleTopicPaper, topicLimitFor } from "../app/test-policy.ts";

const signature = (question) => [question.context ?? "", question.prompt, question.starterCode ?? ""]
  .join("||").toLocaleLowerCase().replace(/\s+/g, " ").trim();

test("every available subject paper has unique content and a plan no longer than one hour", () => {
  for (const subject of subjects) {
    for (const level of subject.levels) {
      for (const paper of getPapers(subject, level)) {
        const relevant = getRelevantTopics(subject, level, paper);
        assert.ok(relevant.length > 0, `${subject.id} ${level} ${paper.id} has no selectable topics`);
        const topics = relevant.slice(0, topicLimitFor(subject, paper));
        const pool = buildUniqueQuestionPool(subject, level, paper, topics, true, "python", 73, []);
        assert.ok(pool.length > 0, `${subject.id} ${level} ${paper.id} has no questions`);
        const signatures = pool.map(signature);
        assert.equal(new Set(signatures).size, signatures.length, `${subject.id} ${level} ${paper.id} repeats question content`);
        const plan = buildTestPlan(subject, paper, topics.length, true, "diagnostic", pool);
        assert.ok(plan.seconds > 0 && plan.seconds <= 3600, `${subject.id} ${level} ${paper.id} has an invalid timer`);
        assert.ok(plan.questionCount <= pool.length, `${subject.id} ${level} ${paper.id} target exceeds its unique pool`);
        if (isSingleTopicPaper(subject.id, paper.id)) assert.equal(topicLimitFor(subject, paper), 1);
      }
    }
  }
});

test("Korean pools do not repeat a question and physics data questions include plotted data", () => {
  for (const subject of subjects.filter((item) => item.id.startsWith("korean"))) {
    for (const level of subject.levels) {
      for (const paper of getPapers(subject, level)) {
        const topics = getRelevantTopics(subject, level, paper).slice(0, topicLimitFor(subject, paper));
        const pool = buildUniqueQuestionPool(subject, level, paper, topics, true, "python", 91, []);
        assert.equal(new Set(pool.map(signature)).size, pool.length, `${subject.id} ${level} ${paper.id} repeats`);
      }
    }
  }
  const physics = subjects.find((item) => item.id === "physics");
  const paper = getPapers(physics, "HL").find((item) => item.id === "p1b");
  const pool = buildUniqueQuestionPool(physics, "HL", paper, getRelevantTopics(physics, "HL", paper).slice(0, 4), true, "python", 11, []);
  assert.ok(pool.every((question) => question.visual === "data-graph" && question.visualData?.x.length === question.visualData?.y.length));
});

test("every question that refers to supplied visual data renders it and every requested diagram has a canvas", () => {
  const visualReference = /data table|chart description|table description|map description|system map|quantitative stimulus|figure\s*1/i;
  const drawingRequest = /fully labelled diagram|labelled diagram|construct.*diagram|draw.*diagram/i;
  for (const subject of subjects) {
    for (const level of subject.levels) {
      for (const paper of getPapers(subject, level)) {
        const pool = buildQuestionPool(subject, level, paper, getRelevantTopics(subject, level, paper), true, "python", 19);
        for (const question of pool) {
          const visibleText = `${question.context ?? ""} ${question.prompt}`;
          if (visualReference.test(visibleText)) assert.ok(question.visual || question.responseType === "diagram", `${question.id} refers to a missing visual`);
          if (drawingRequest.test(question.prompt)) assert.equal(question.responseType, "diagram", `${question.id} requests a diagram without a drawing canvas`);
          if (question.visual === "data-table") assert.ok(question.visualData?.columns?.length && question.visualData?.rows?.length, `${question.id} has an empty table`);
          if (question.visual === "bar-chart") assert.equal(question.visualData?.categories?.length, question.visualData?.y?.length, `${question.id} has incomplete chart data`);
          if (question.visual === "process-flow") assert.ok(question.visualData?.nodes?.length >= 2, `${question.id} has an incomplete process flow`);
        }
      }
    }
  }
});
