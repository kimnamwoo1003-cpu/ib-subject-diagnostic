"use client";

import { useEffect, useMemo, useState } from "react";
import { subjectCatalog } from "../data";

const SITES_ORIGIN = "https://ib-subject-diagnostic.justinamwoo.chatgpt.site";
const evidenceFetch = (path: string, init: RequestInit = {}) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("ibsd-session-token") : null;
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  const remote = typeof window !== "undefined" && window.location.hostname.endsWith("github.io");
  return fetch(`${remote ? SITES_ORIGIN : ""}${path}`, { ...init, headers });
};

type Evidence = {
  id: number; userEmail: string; subjectId: string; level: string; componentName: string; sourcePlatform: string;
  scoreEarned: number; scorePossible: number; percent: number; assessmentWeight: number; assessmentDate: string;
  originalFilename: string; evidenceMime: string; evidenceSize: number; status: "pending" | "verified" | "rejected";
  automatedChecks: Array<{ key: string; label: string; passed: boolean }>; adminNote: string; reviewedAt: string | null; createdAt: string;
};
const platformName: Record<string, string> = { managebac: "ManageBac+", toddle: "Toddle", "google-classroom": "Google Classroom", "microsoft-teams": "Microsoft Teams", canvas: "Canvas", moodle: "Moodle" };
const subjectName = (id: string) => subjectCatalog.find((subject) => subject.id === id)?.name ?? id;

export default function GradeEvidenceAdmin() {
  const [records, setRecords] = useState<Evidence[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const load = () => evidenceFetch("/api/admin/grades", { cache: "no-store" }).then(async (response) => {
    const payload = await response.json() as { records?: Evidence[]; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Grade evidence could not be loaded."); setRecords(payload.records ?? []);
  });
  useEffect(() => { load().catch((error) => setMessage(error instanceof Error ? error.message : "Grade evidence could not be loaded.")); }, []);
  const visible = useMemo(() => showHistory ? records : records.filter((record) => record.status === "pending"), [records, showHistory]);
  const pending = records.filter((record) => record.status === "pending").length;

  const viewScreenshot = async (id: number) => {
    const response = await evidenceFetch(`/api/admin/grades?evidence=${id}`, { cache: "no-store" });
    if (!response.ok) { setMessage("Screenshot could not be opened."); return; }
    const url = URL.createObjectURL(await response.blob()); window.open(url, "_blank", "noopener,noreferrer"); window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  const review = async (record: Evidence, decision: "verify" | "reject") => {
    setBusy(record.id); setMessage("");
    const response = await evidenceFetch("/api/admin/grades", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: record.id, decision, adminNote: notes[record.id] ?? "" }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) setMessage(payload.error ?? "Evidence review failed.");
    else { setMessage(decision === "verify" ? "Evidence verified and added to the learner's planner and cohort rank." : "Evidence rejected and excluded from calculations."); await load(); }
    setBusy(null);
  };

  return <section className="evidence-admin-section"><div className="evidence-admin-heading"><div><span className="eyebrow">GRADE EVIDENCE REVIEW</span><h2>School-platform screenshots</h2><p>Compare the entered marks with the screenshot. Automated checks detect format and exact duplicates, but administrator review is required before a score is considered verified.</p></div><div><strong>{pending}</strong><span>waiting</span><button className="quiet-button" onClick={() => setShowHistory((value) => !value)}>{showHistory ? "Pending only" : "View review history"}</button></div></div>
    {message && <div className="premium-message">{message}</div>}
    <div className="evidence-review-grid">{visible.length ? visible.map((record) => <article className={`evidence-review-card ${record.status}`} key={record.id}><header><div><span>{record.status === "pending" ? "PENDING MANUAL REVIEW" : record.status.toUpperCase()}</span><h3>{record.userEmail}</h3><small>Submitted {new Date(record.createdAt).toLocaleString("en-GB")}</small></div><b>{record.percent}%</b></header><dl><div><dt>Course</dt><dd>{subjectName(record.subjectId)} {record.level}</dd></div><div><dt>Component</dt><dd>{record.componentName} · weight {record.assessmentWeight}%</dd></div><div><dt>Entered marks</dt><dd>{record.scoreEarned} / {record.scorePossible}</dd></div><div><dt>Source</dt><dd>{platformName[record.sourcePlatform] ?? record.sourcePlatform}</dd></div><div><dt>Assessment date</dt><dd>{record.assessmentDate}</dd></div><div><dt>File</dt><dd>{record.originalFilename} · {(record.evidenceSize / 1024).toFixed(0)} KB</dd></div></dl><ul className="automated-checks">{record.automatedChecks.map((check) => <li key={check.key} className={check.passed ? "pass" : "fail"}>{check.passed ? "✓" : "!"} {check.label}</li>)}</ul><button className="secondary-button evidence-preview" onClick={() => void viewScreenshot(record.id)}>Open protected screenshot</button>{record.status === "pending" ? <><label className="admin-review-note"><span>Review note (required when rejecting)</span><textarea rows={3} value={notes[record.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [record.id]: event.target.value }))} placeholder="Record any mismatch, cropping problem or reason for rejection."/></label><div className="payment-actions"><button className="secondary-button" disabled={busy === record.id || !(notes[record.id] ?? "").trim()} onClick={() => void review(record, "reject")}>Reject</button><button className="primary-button" disabled={busy === record.id} onClick={() => void review(record, "verify")}>{busy === record.id ? "Saving…" : "Verify score"}</button></div></> : <p className="review-outcome">{record.adminNote || `Reviewed ${record.reviewedAt ? new Date(record.reviewedAt).toLocaleString("en-GB") : ""}`}</p>}</article>) : <div className="admin-empty">No {showHistory ? "grade evidence" : "pending screenshots"} to show.</div>}</div>
    <div className="admin-note"><strong>Reviewer checklist</strong><p>Confirm the platform identity, subject and level, assessment name, score numerator and denominator, date, and signs of cropping or alteration. Do not approve solely because the automated checks passed.</p></div>
  </section>;
}
