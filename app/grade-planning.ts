export type CourseLevel = "SL" | "HL";

export type AssessmentComponent = {
  id: string;
  name: string;
  weight: number;
};

const science = [
  { id: "p1", name: "Paper 1 (1A + 1B)", weight: 36 },
  { id: "p2", name: "Paper 2", weight: 44 },
  { id: "ia", name: "Scientific investigation", weight: 20 },
];

const languageB = [
  { id: "p1", name: "Paper 1: Writing", weight: 25 },
  { id: "p2-listening", name: "Paper 2: Listening", weight: 25 },
  { id: "p2-reading", name: "Paper 2: Reading", weight: 25 },
  { id: "oral", name: "Individual oral", weight: 25 },
];

const suggestedINS: Record<string, Record<CourseLevel, AssessmentComponent[]>> = {
  economics: {
    SL: [{ id: "p1", name: "Paper 1", weight: 30 }, { id: "p2", name: "Paper 2", weight: 40 }, { id: "ia", name: "Commentary portfolio", weight: 30 }],
    HL: [{ id: "p1", name: "Paper 1", weight: 20 }, { id: "p2", name: "Paper 2", weight: 30 }, { id: "p3", name: "Paper 3", weight: 30 }, { id: "ia", name: "Commentary portfolio", weight: 20 }],
  },
  business: {
    SL: [{ id: "p1", name: "Paper 1", weight: 35 }, { id: "p2", name: "Paper 2", weight: 35 }, { id: "ia", name: "Business research project", weight: 30 }],
    HL: [{ id: "p1", name: "Paper 1", weight: 25 }, { id: "p2", name: "Paper 2", weight: 30 }, { id: "p3", name: "Paper 3", weight: 25 }, { id: "ia", name: "Business research project", weight: 20 }],
  },
  geography: {
    SL: [{ id: "p1", name: "Paper 1", weight: 35 }, { id: "p2", name: "Paper 2", weight: 40 }, { id: "ia", name: "Fieldwork", weight: 25 }],
    HL: [{ id: "p1", name: "Paper 1", weight: 35 }, { id: "p2", name: "Paper 2", weight: 25 }, { id: "p3", name: "Paper 3", weight: 20 }, { id: "ia", name: "Fieldwork", weight: 20 }],
  },
  history: {
    SL: [{ id: "p1", name: "Paper 1", weight: 30 }, { id: "p2", name: "Paper 2", weight: 45 }, { id: "ia", name: "Historical investigation", weight: 25 }],
    HL: [{ id: "p1", name: "Paper 1", weight: 20 }, { id: "p2", name: "Paper 2", weight: 25 }, { id: "p3", name: "Paper 3", weight: 35 }, { id: "ia", name: "Historical investigation", weight: 20 }],
  },
  psychology: {
    SL: [{ id: "p1", name: "Paper 1", weight: 50 }, { id: "p2", name: "Paper 2", weight: 25 }, { id: "ia", name: "Experimental study", weight: 25 }],
    HL: [{ id: "p1", name: "Paper 1", weight: 40 }, { id: "p2", name: "Paper 2", weight: 20 }, { id: "p3", name: "Paper 3", weight: 20 }, { id: "ia", name: "Experimental study", weight: 20 }],
  },
};

export function assessmentComponents(subjectId: string, level: CourseLevel): AssessmentComponent[] {
  if (["biology", "chemistry", "physics", "sehs"].includes(subjectId)) return science;
  if (subjectId === "math" || subjectId === "math-ai") return level === "HL"
    ? [{ id: "p1", name: "Paper 1", weight: 30 }, { id: "p2", name: "Paper 2", weight: 30 }, { id: "p3", name: "Paper 3", weight: 20 }, { id: "ia", name: "Mathematical exploration", weight: 20 }]
    : [{ id: "p1", name: "Paper 1", weight: 40 }, { id: "p2", name: "Paper 2", weight: 40 }, { id: "ia", name: "Mathematical exploration", weight: 20 }];
  if (subjectId.endsWith("-b") || subjectId === "language-ab-initio") return languageB;
  if (subjectId.endsWith("-a") || subjectId.endsWith("-a-literature") || subjectId === "english-a" || subjectId === "english-a-literature") return level === "HL"
    ? [{ id: "p1", name: "Paper 1", weight: 35 }, { id: "p2", name: "Paper 2", weight: 25 }, { id: "hl-essay", name: "HL essay", weight: 20 }, { id: "oral", name: "Individual oral", weight: 20 }]
    : [{ id: "p1", name: "Paper 1", weight: 35 }, { id: "p2", name: "Paper 2", weight: 35 }, { id: "oral", name: "Individual oral", weight: 30 }];
  if (suggestedINS[subjectId]) return suggestedINS[subjectId][level];
  if (level === "HL") return [{ id: "p1", name: "Paper 1", weight: 30 }, { id: "p2", name: "Paper 2", weight: 30 }, { id: "p3", name: "Paper 3 / HL component", weight: 20 }, { id: "ia", name: "Internal assessment", weight: 20 }];
  return [{ id: "p1", name: "Paper 1", weight: 40 }, { id: "p2", name: "Paper 2", weight: 40 }, { id: "ia", name: "Internal assessment", weight: 20 }];
}

export type VerifiedGrade = { percent: number; assessmentWeight: number };

export function gradeSummary(records: VerifiedGrade[], targetPercent: number, upcomingWeight: number) {
  const contribution = records.reduce((sum, row) => sum + row.percent * row.assessmentWeight / 100, 0);
  const completedWeight = records.reduce((sum, row) => sum + row.assessmentWeight, 0);
  const currentPercent = completedWeight ? contribution / completedWeight * 100 : null;
  const nextTotalWeight = completedWeight + upcomingWeight;
  const requiredNext = upcomingWeight > 0 && nextTotalWeight > 0
    ? (targetPercent * nextTotalWeight / 100 - contribution) * 100 / upcomingWeight
    : null;
  return {
    contribution: Math.round(contribution * 10) / 10,
    completedWeight,
    currentPercent: currentPercent === null ? null : Math.round(currentPercent * 10) / 10,
    gap: currentPercent === null ? null : Math.round((targetPercent - currentPercent) * 10) / 10,
    requiredNext: requiredNext === null ? null : Math.round(requiredNext * 10) / 10,
  };
}
