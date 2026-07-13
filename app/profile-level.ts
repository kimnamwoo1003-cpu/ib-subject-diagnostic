import type { Level } from "./data";

export function mergeSelectedSubjectLevel(selectedSubjects: string[], currentLevels: Record<string, Level>, subjectId: string, level: Level) {
  if (!selectedSubjects.includes(subjectId)) throw new Error("Subject is not selected");
  return { ...currentLevels, [subjectId]: level };
}
