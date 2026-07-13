import type { Paper, Question, Subject } from "./data";

export type TestMode = "diagnostic" | "monthly";

const languageA = (subjectId: string) => /-(?:a|a-literature)$/.test(subjectId);
const languageB = (subjectId: string) => subjectId.endsWith("-b");

/** Papers whose authentic response is itself the diagnostic. Splitting these across
 * several topics would produce an unrealistic essay marathon inside a one-hour test. */
export function isSingleTopicPaper(subjectId: string, paperId: string) {
  if (paperId === "concept") return false;
  if (languageA(subjectId)) return paperId === "p1" || paperId === "p2";
  if (languageB(subjectId)) return paperId === "p1";
  return (
    (subjectId === "economics" && paperId === "p1") ||
    (subjectId === "history" && (paperId === "p2" || paperId === "p3")) ||
    (subjectId === "global-politics" && paperId === "p2") ||
    (subjectId === "philosophy" && (paperId === "p1" || paperId === "p2")) ||
    (subjectId === "anthropology" && paperId === "p2") ||
    (subjectId === "world-religions" && paperId === "p2")
  );
}

export function topicLimitFor(subject: Subject, paper: Paper) {
  if (isSingleTopicPaper(subject.id, paper.id)) return 1;
  if (paper.id === "concept") return 12;
  if (paper.id === "p3") return 2;
  if (languageB(subject.id) && paper.id === "p2r") return 5;
  if (subject.group === "Mathematics") return 6;
  if (subject.group === "Sciences") return paper.id === "p1a" ? 12 : 6;
  if (subject.group === "I&S") return 4;
  return 6;
}

const median = (values: number[]) => {
  if (!values.length) return 5;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

export function buildTestPlan(subject: Subject, paper: Paper, topicCount: number, premium: boolean, mode: TestMode, pool: Question[]) {
  const singleTopic = isSingleTopicPaper(subject.id, paper.id);
  const typicalMinutes = Math.max(2, Math.min(60, median(pool.filter((question) => question.difficultyLevel === 3 || question.difficulty === "Standard").map((question) => question.estimatedMinutes ?? Math.max(2, question.marks)))));
  let desired: number;
  if (singleTopic) desired = 1;
  else if (paper.id === "concept") desired = premium ? 12 : 8;
  else if (mode === "monthly") desired = Math.max(topicCount, premium ? 10 : 7);
  else if (paper.id === "p1a") desired = premium ? 15 : 10;
  else if (languageB(subject.id) && paper.id === "p2r") desired = premium ? 10 : 7;
  else desired = Math.max(topicCount, premium ? 6 : 5);

  const maxByTime = Math.max(1, Math.floor(56 / typicalMinutes));
  const questionCount = Math.max(1, Math.min(desired, maxByTime, pool.length));
  const plannedMinutes = singleTopic ? 60 : Math.min(60, Math.max(15, questionCount * typicalMinutes + 4));
  return { questionCount, seconds: plannedMinutes * 60, plannedMinutes, typicalMinutes, singleTopic };
}

