"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { subjectCatalog, type Level } from "./data";
import { assessmentComponents, gradeSummary } from "./grade-planning";

const SITES_ORIGIN = "https://ib-subject-diagnostic.justinamwoo.chatgpt.site";
const gradeFetch = (path: string, init: RequestInit = {}) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("ibsd-session-token") : null;
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  const remote = typeof window !== "undefined" && window.location.hostname.endsWith("github.io");
  return fetch(`${remote ? SITES_ORIGIN : ""}${path}`, { ...init, headers });
};

type Check = { key: string; label: string; passed: boolean };
type GradeRecord = {
  id: number; subjectId: string; level: Level; componentId: string; componentName: string; sourcePlatform: string;
  scoreEarned: number; scorePossible: number; percent: number; assessmentWeight: number; assessmentDate: string;
  status: "pending" | "verified" | "rejected"; automatedChecks: Check[]; adminNote: string; createdAt: string;
};
type Goal = { subjectId: string; level: Level; targetPercent: number; grade7Boundary: number; upcomingComponentId: string; upcomingComponentName: string; upcomingWeight: number };
type Summary = {
  subjectId: string; level: Level; currentPercent: number | null; gap: number | null; requiredNext: number | null;
  requiredForSeven: number | null; completedWeight: number; verifiedComponents: number; rank: number | null; cohortSize: number; goal: Goal | null;
};
type GradeData = { records: GradeRecord[]; goals: Goal[]; summaries: Summary[] };

const platformLabels: Record<string, string> = {
  managebac: "ManageBac+", toddle: "Toddle", "google-classroom": "Google Classroom",
  "microsoft-teams": "Microsoft Teams", canvas: "Canvas", moodle: "Moodle",
};
const subjectName = (id: string) => subjectCatalog.find((subject) => subject.id === id)?.name ?? id;

export default function GradeTracker({ selectedSubjects, subjectLevels, onBack }: { selectedSubjects: string[]; subjectLevels: Record<string, Level>; onBack: () => void }) {
  const [data, setData] = useState<GradeData>({ records: [], goals: [], summaries: [] });
  const [subjectId, setSubjectId] = useState(selectedSubjects[0] ?? "physics");
  const level = subjectLevels[subjectId] ?? "SL";
  const components = useMemo(() => assessmentComponents(subjectId, level), [subjectId, level]);
  const [componentId, setComponentId] = useState(components[0]?.id ?? "p1");
  const [sourcePlatform, setSourcePlatform] = useState("managebac");
  const [scoreEarned, setScoreEarned] = useState("");
  const [scorePossible, setScorePossible] = useState("");
  const [assessmentWeight, setAssessmentWeight] = useState(String(components[0]?.weight ?? 20));
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetPercent, setTargetPercent] = useState("75");
  const [grade7Boundary, setGrade7Boundary] = useState("75");
  const [upcomingComponentId, setUpcomingComponentId] = useState(components[0]?.id ?? "p1");
  const [upcomingWeight, setUpcomingWeight] = useState(String(components[0]?.weight ?? 20));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [evidenceName, setEvidenceName] = useState("");

  const load = async () => {
    const response = await gradeFetch("/api/grades", { cache: "no-store" });
    const payload = await response.json() as GradeData & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Grade data could not be loaded.");
    setData(payload);
    const saved = payload.goals.find((goal) => goal.subjectId === subjectId && goal.level === level);
    if (saved) {
      setTargetPercent(String(saved.targetPercent)); setGrade7Boundary(String(saved.grade7Boundary));
      setUpcomingComponentId(saved.upcomingComponentId); setUpcomingWeight(String(saved.upcomingWeight));
    }
  };
  useEffect(() => {
    let active = true;
    gradeFetch("/api/grades", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as GradeData & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Grade data could not be loaded.");
      return payload;
    }).then((payload) => {
      if (!active) return;
      setData(payload);
      const saved = payload.goals.find((goal) => goal.subjectId === subjectId && goal.level === level);
      if (saved) { setTargetPercent(String(saved.targetPercent)); setGrade7Boundary(String(saved.grade7Boundary)); setUpcomingComponentId(saved.upcomingComponentId); setUpcomingWeight(String(saved.upcomingWeight)); }
      setLoading(false);
    }).catch((error) => { if (active) { setMessage(error instanceof Error ? error.message : "Grade data could not be loaded."); setLoading(false); } });
    return () => { active = false; };
  }, [level, subjectId]);

  const chooseSubject = (nextSubjectId: string) => {
    const nextLevel = subjectLevels[nextSubjectId] ?? "SL";
    const nextComponents = assessmentComponents(nextSubjectId, nextLevel);
    const saved = data.goals.find((goal) => goal.subjectId === nextSubjectId && goal.level === nextLevel);
    const first = nextComponents[0];
    setSubjectId(nextSubjectId); setComponentId(first?.id ?? "p1"); setAssessmentWeight(String(first?.weight ?? 20));
    setTargetPercent(String(saved?.targetPercent ?? 75)); setGrade7Boundary(String(saved?.grade7Boundary ?? 75));
    setUpcomingComponentId(saved?.upcomingComponentId ?? first?.id ?? "p1"); setUpcomingWeight(String(saved?.upcomingWeight ?? first?.weight ?? 20));
  };

  const currentComponent = components.find((component) => component.id === componentId) ?? components[0];
  const upcomingComponent = components.find((component) => component.id === upcomingComponentId) ?? components[0];
  const records = data.records.filter((record) => record.subjectId === subjectId && record.level === level);
  const summary = data.summaries.find((item) => item.subjectId === subjectId && item.level === level);
  const verifiedLatest = records.filter((record) => record.status === "verified").filter((record, index, rows) => rows.findIndex((candidate) => candidate.componentId === record.componentId) === index);
  const localTarget = gradeSummary(verifiedLatest, Number(targetPercent) || 75, Number(upcomingWeight) || 0);
  const localSeven = gradeSummary(verifiedLatest, Number(grade7Boundary) || 75, Number(upcomingWeight) || 0);

  const submitEvidence = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    form.set("sourcePlatform", sourcePlatform); form.set("subjectId", subjectId); form.set("level", level);
    form.set("componentId", componentId); form.set("componentName", currentComponent?.name ?? componentId);
    form.set("scoreEarned", scoreEarned); form.set("scorePossible", scorePossible); form.set("assessmentWeight", assessmentWeight); form.set("assessmentDate", assessmentDate);
    try {
      const response = await gradeFetch("/api/grades", { method: "POST", body: form });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Evidence could not be submitted.");
      event.currentTarget.reset(); setScoreEarned(""); setScorePossible(""); setEvidenceName("");
      setMessage("Evidence submitted. Automated checks passed; an administrator must still review the screenshot before it affects your rank.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Evidence could not be submitted."); }
    finally { setBusy(false); }
  };

  const saveGoal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await gradeFetch("/api/grades/goals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subjectId, level, targetPercent, grade7Boundary, upcomingComponentId, upcomingComponentName: upcomingComponent?.name ?? upcomingComponentId, upcomingWeight }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Goal could not be saved.");
      setMessage("Goal and upcoming assessment plan saved."); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Goal could not be saved."); }
    finally { setBusy(false); }
  };

  const viewEvidence = async (id: number) => {
    setMessage("");
    try {
      const response = await gradeFetch(`/api/grades/evidence?id=${id}`, { cache: "no-store" });
      if (!response.ok) throw new Error("The screenshot could not be opened.");
      const url = URL.createObjectURL(await response.blob()); window.open(url, "_blank", "noopener,noreferrer"); window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) { setMessage(error instanceof Error ? error.message : "The screenshot could not be opened."); }
  };

  return <div className="page-container grade-page"><button className="back-link" onClick={onBack}>← Dashboard</button>
    <div className="report-heading"><span className="eyebrow">PREMIUM GRADE PLANNER</span><h1>Verified school grades & targets</h1><p>Upload evidence from your school platform, plan each weighted component and see your private rank among Premium learners in the same subject and level.</p></div>
    <section className="grade-subject-picker"><label><span>SUBJECT</span><select value={subjectId} onChange={(event) => chooseSubject(event.target.value)}>{selectedSubjects.map((id) => <option key={id} value={id}>{subjectName(id)}</option>)}</select></label><div><span>COURSE LEVEL</span><strong>{level}</strong><small>Uses the level saved on your dashboard.</small></div></section>
    {loading ? <div className="admin-empty">Loading verified grade data…</div> : <>
      <section className="grade-kpis">
        <article><span>VERIFIED WEIGHTED AVERAGE</span><strong>{summary?.currentPercent ?? localTarget.currentPercent ?? "—"}{(summary?.currentPercent ?? localTarget.currentPercent) !== null ? "%" : ""}</strong><small>{summary?.verifiedComponents ?? verifiedLatest.length} latest verified components · {summary?.completedWeight ?? localTarget.completedWeight}% recorded weight</small></article>
        <article><span>PERSONAL TARGET GAP</span><strong>{localTarget.gap === null ? "—" : `${localTarget.gap > 0 ? "+" : ""}${localTarget.gap}%`}</strong><small>{localTarget.gap === null ? "Add verified evidence to calculate the gap." : localTarget.gap > 0 ? "still needed to reach your target" : "at or above your target"}</small></article>
        <article><span>NEXT ASSESSMENT FOR GRADE 7</span><strong>{localSeven.requiredNext === null ? "—" : localSeven.requiredNext > 100 ? ">100%" : `${Math.max(0, localSeven.requiredNext)}%`}</strong><small>{localSeven.requiredNext !== null && localSeven.requiredNext > 100 ? "Not reachable from this one assessment alone." : `Planning line ${grade7Boundary}% · next weight ${upcomingWeight || 0}%`}</small></article>
        <article><span>PREMIUM COHORT RANK</span><strong>{summary?.rank ? `${summary.rank} / ${summary.cohortSize}` : "—"}</strong><small>{(summary?.cohortSize ?? 0) < 3 ? "Shown after 3 Premium learners have verified grades in this course." : "Based only on administrator-verified evidence."}</small></article>
      </section>
      <div className="grade-columns">
        <form className="grade-panel" onSubmit={submitEvidence}><div><span className="step-label">01</span><h2>Add school grade evidence</h2><p>Enter the score exactly as shown and upload the original screenshot. Hide unrelated personal information before uploading.</p></div><div className="grade-form-grid">
          <label><span>School platform</span><select value={sourcePlatform} onChange={(event) => setSourcePlatform(event.target.value)}>{Object.entries(platformLabels).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label><span>Assessment component</span><select value={componentId} onChange={(event) => { const next = components.find((component) => component.id === event.target.value); setComponentId(event.target.value); if (next) setAssessmentWeight(String(next.weight)); }}>{components.map((component) => <option key={component.id} value={component.id}>{component.name} · {component.weight}% default</option>)}</select></label>
          <label><span>Marks earned</span><input type="number" min="0" step="0.1" value={scoreEarned} onChange={(event) => setScoreEarned(event.target.value)} required/></label>
          <label><span>Maximum marks</span><input type="number" min="0.1" step="0.1" value={scorePossible} onChange={(event) => setScorePossible(event.target.value)} required/></label>
          <label><span>Assessment weight (%)</span><input type="number" min="1" max="100" value={assessmentWeight} onChange={(event) => setAssessmentWeight(event.target.value)} required/></label>
          <label><span>Assessment date</span><input type="date" max={new Date().toISOString().slice(0, 10)} value={assessmentDate} onChange={(event) => setAssessmentDate(event.target.value)} required/></label>
          <label className="full custom-file-field"><span>Original screenshot (PNG, JPEG or WebP · max 8 MB)</span><span className="custom-file-control"><strong>Choose screenshot</strong><em>{evidenceName || "No file selected"}</em></span><input className="custom-file-input" type="file" name="evidence" accept="image/png,image/jpeg,image/webp" required onChange={(event) => setEvidenceName(event.target.files?.[0]?.name ?? "")}/></label>
          <label className="grade-confirm full"><input type="checkbox" required/><span>I confirm this is my own unaltered school record and the entered marks match the screenshot.</span></label>
        </div><button className="primary-button" disabled={busy}>{busy ? "Submitting…" : "Submit for verification"} <span>→</span></button></form>
        <form className="grade-panel target-panel" onSubmit={saveGoal}><div><span className="step-label">02</span><h2>Set target & next assessment</h2><p>Grade boundaries vary by examination session. Use the value from your school or current session; this is a planning estimate, not an official predicted grade.</p></div><div className="grade-form-grid one">
          <label><span>Personal target (%)</span><input type="number" min="1" max="100" value={targetPercent} onChange={(event) => setTargetPercent(event.target.value)} required/></label>
          <label><span>Grade 7 planning boundary (%)</span><input type="number" min="1" max="100" value={grade7Boundary} onChange={(event) => setGrade7Boundary(event.target.value)} required/></label>
          <label><span>Upcoming component</span><select value={upcomingComponentId} onChange={(event) => { const next = components.find((component) => component.id === event.target.value); setUpcomingComponentId(event.target.value); if (next) setUpcomingWeight(String(next.weight)); }}>{components.map((component) => <option key={component.id} value={component.id}>{component.name}</option>)}</select></label>
          <label><span>Upcoming assessment weight (%)</span><input type="number" min="1" max="100" value={upcomingWeight} onChange={(event) => setUpcomingWeight(event.target.value)} required/></label>
        </div><div className="planning-preview"><span>PLANNING RESULT</span><strong>{localTarget.requiredNext === null ? "Add a verified result first" : localTarget.requiredNext > 100 ? "Target is not reachable in one assessment" : `${Math.max(0, localTarget.requiredNext)}% needed next`}</strong><small>Calculation uses only each component&apos;s latest verified result and the next assessment weight.</small></div><button className="secondary-button" disabled={busy}>Save grade plan</button></form>
      </div>
      {message && <div className="premium-message" role="status">{message}</div>}
      <section className="grade-history"><div className="section-heading compact"><div><span className="step-label">03</span><h2>Evidence history</h2></div><p>Only Verified rows affect calculations and ranking.</p></div>{records.length ? <div className="grade-history-list">{records.map((record) => <article key={record.id}><div><span>{record.componentName}</span><strong>{record.scoreEarned}/{record.scorePossible} · {record.percent}%</strong><small>{platformLabels[record.sourcePlatform] ?? record.sourcePlatform} · {record.assessmentDate} · weight {record.assessmentWeight}%</small></div><div><b className={`evidence-status ${record.status}`}>{record.status === "verified" ? "Admin verified" : record.status === "pending" ? "Pending review" : "Rejected"}</b><button className="quiet-button" onClick={() => void viewEvidence(record.id)}>View screenshot</button></div>{record.adminNote && <p>Administrator note: {record.adminNote}</p>}</article>)}</div> : <div className="empty-state"><strong>No grade evidence yet</strong><p>Submit your first school-platform screenshot above.</p></div>}</section>
      <section className="grade-safety"><strong>How verification works</strong><ol><li>The site checks file type, score arithmetic, date and exact duplicate reuse.</li><li>The result remains Pending until the administrator compares the entered fields with the screenshot.</li><li>Only Admin verified results affect targets or rankings. A screenshot alone cannot prove authenticity beyond doubt.</li></ol></section>
    </>}
  </div>;
}
