"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { subjectCatalog } from "../data";
import { BrandLockup } from "../logo";

const SITES_ORIGIN = "https://ib-subject-diagnostic.justinamwoo.chatgpt.site";
const isStaticPages = () => typeof window !== "undefined" && window.location.hostname.endsWith("github.io");
const adminFetch = (path: string, init: RequestInit = {}) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("ibsd-session-token") : null;
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(`${isStaticPages() ? SITES_ORIGIN : ""}${path}`, { ...init, headers });
};

type Activity = { id: number; action: string; subjectId: string | null; level: string | null; paperId: string | null; detail: Record<string, unknown>; createdAt: string };
type SubjectProgress = { subjectId: string; attempts: number; averagePercent: number; latestPercent: number; latestLevel: string; latestPaper: string; lastTestAt: string; topics: Array<{ code: string; title: string; percent: number }> };
type PremiumRequest = { id: number; amountKrw: number; paymentMethod: string; payerName: string; paymentReference: string; note: string; status: "pending" | "approved" | "rejected"; adminNote: string; createdAt: string; reviewedAt: string | null };
type UserRow = {
  email: string; displayName: string; premium: boolean; selectedSubjects: string[]; subjectLevels: Record<string, "SL" | "HL">; createdAt: string; updatedAt: string;
  progress: { attemptCount: number; averagePercent: number | null; latestAttempt: null | { subjectId: string; subjectName: string; level: string; paperName: string; percent: number; createdAt: string }; lastActivity: Activity | null; recentActivities: Activity[]; subjects: SubjectProgress[] };
  premiumRequest: PremiumRequest | null;
};

const actionLabel: Record<string, string> = {
  subject_opened: "Opened subject", test_prepared: "Prepared test", pdf_downloaded: "Downloaded PDF",
  test_started: "Started test", answer_entry_opened: "Opened answer check", test_submitted: "Submitted test",
};
const subjectName = (id?: string | null) => subjectCatalog.find((subject) => subject.id === id)?.name ?? id ?? "General";

export default function AdminClient({ adminName, embedded = false, onBack }: { adminName: string; embedded?: boolean; onBack?: () => void }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [view, setView] = useState<"requests" | "progress" | "accounts">("requests");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const reload = () => {
    setLoading(true);
    adminFetch("/api/admin/users", { cache: "no-store" }).then((response) => response.json()).then((data: { users?: UserRow[]; error?: string }) => {
      if (data.error) setMessage(data.error);
      setUsers(data.users ?? []); setLoading(false);
    }).catch(() => { setMessage("Admin data could not be loaded."); setLoading(false); });
  };
  useEffect(() => {
    let active = true;
    adminFetch("/api/admin/users", { cache: "no-store" }).then((response) => response.json()).then((data: { users?: UserRow[]; error?: string }) => {
      if (!active) return;
      if (data.error) setMessage(data.error);
      setUsers(data.users ?? []); setLoading(false);
    }).catch(() => { if (active) { setMessage("Admin data could not be loaded."); setLoading(false); } });
    return () => { active = false; };
  }, []);
  const visibleUsers = useMemo(() => users.filter((user) => `${user.displayName} ${user.email} ${user.premiumRequest?.payerName ?? ""} ${user.premiumRequest?.paymentReference ?? ""}`.toLowerCase().includes(query.toLowerCase())), [users, query]);
  const pending = visibleUsers.filter((user) => user.premiumRequest?.status === "pending");

  const setPremium = async (target: UserRow, premium: boolean) => {
    setSaving(target.email); setMessage("");
    const response = await adminFetch("/api/admin/users", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: target.email, premium }) });
    if (response.ok) { setUsers((rows) => rows.map((row) => row.email === target.email ? { ...row, premium } : row)); setMessage(`${target.displayName} now has ${premium ? "Premium" : "Free"} access.`); }
    else { const data = await response.json() as { error?: string }; setMessage(data.error ?? "The account could not be updated."); }
    setSaving(null);
  };

  const review = async (target: UserRow, decision: "approve" | "reject") => {
    if (!target.premiumRequest) return;
    setSaving(target.email); setMessage("");
    const response = await adminFetch("/api/admin/users", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: target.premiumRequest.id, decision }) });
    if (response.ok) { setMessage(`${target.displayName}'s payment was ${decision === "approve" ? "accepted and Premium activated" : "rejected"}.`); reload(); }
    else { const data = await response.json() as { error?: string }; setMessage(data.error ?? "The request could not be reviewed."); }
    setSaving(null);
  };
  return <div className={`admin-page ${embedded ? "embedded-admin" : ""}`}>
    {!embedded && <header className="admin-topbar"><Link className="brand" href="/"><BrandLockup light/></Link><div><span>Signed in as {adminName}</span><Link className="quiet-button" href="/">Student site</Link></div></header>}
    <div className="admin-container">
      {embedded && <button className="back-link" onClick={onBack}>← Dashboard</button>}
      <section className="admin-hero"><div><span className="eyebrow">ADMIN CONSOLE</span><h1>Premium reviews & student progress</h1><p>Review Premium payments and see each learner&apos;s latest test progress without exposing their answers.</p></div><div className="admin-stats"><div><strong>{users.length}</strong><span>Accounts</span></div><div><strong>{pending.length}</strong><span>Pending</span></div><div><strong>{users.reduce((sum, user) => sum + user.progress.attemptCount, 0)}</strong><span>Tests</span></div></div></section>
      <section className="admin-controls"><div className="admin-tabs"><button className={view === "requests" ? "active" : ""} onClick={() => setView("requests")}>Payment requests</button><button className={view === "progress" ? "active" : ""} onClick={() => setView("progress")}>Student progress</button><button className={view === "accounts" ? "active" : ""} onClick={() => setView("accounts")}>Account access</button></div><label><span>Search accounts or payment reference</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Username, payer or reference" /></label>{message && <p>{message}</p>}</section>
      {loading ? <div className="admin-empty">Loading admin data…</div> : view === "requests" ? <section className="request-grid">{pending.length ? pending.map((user) => { const request = user.premiumRequest!; return <article className="payment-card" key={request.id}><div><span>PENDING VERIFICATION</span><h2>{user.displayName}</h2><small>Submitted {new Date(request.createdAt).toLocaleString("en-GB")}</small></div><dl><div><dt>Amount paid</dt><dd>₩{request.amountKrw.toLocaleString()}</dd></div><div><dt>Method</dt><dd>{request.paymentMethod.replace("_", " ")}</dd></div><div><dt>Payer</dt><dd>{request.payerName}</dd></div><div><dt>Reference</dt><dd>{request.paymentReference}</dd></div></dl>{request.note && <p>{request.note}</p>}<div className="payment-actions"><button className="secondary-button" disabled={saving === user.email} onClick={() => void review(user, "reject")}>Reject</button><button className="primary-button" disabled={saving === user.email} onClick={() => void review(user, "approve")}>{saving === user.email ? "Updating…" : "Accept payment & activate"}</button></div></article>; }) : <div className="admin-empty">No payment confirmations are waiting for review.</div>}</section> : view === "progress" ? <section className="progress-admin-list">{visibleUsers.map((user) => <details className="student-progress-card" key={user.email}><summary><div><strong>{user.displayName}</strong><small>{user.selectedSubjects.length}/6 subjects · {user.progress.attemptCount} completed tests</small></div><span>{user.progress.latestAttempt ? <><b>{user.progress.latestAttempt.percent}%</b><small>{subjectName(user.progress.latestAttempt.subjectId)} {user.progress.latestAttempt.level}</small></> : <small>No completed test</small>}</span><span>{user.progress.lastActivity ? <><b>{actionLabel[user.progress.lastActivity.action] ?? user.progress.lastActivity.action}</b><small>{subjectName(user.progress.lastActivity.subjectId)} {user.progress.lastActivity.level ?? ""} · {new Date(user.progress.lastActivity.createdAt).toLocaleString("en-GB")}</small></> : <small>No activity yet</small>}</span></summary><div className="student-progress-body"><div><h3>Subject progress</h3>{user.progress.subjects.length ? user.progress.subjects.map((item) => <article key={item.subjectId}><strong>{subjectName(item.subjectId)} {item.latestLevel}</strong><span>{item.attempts} tests · {item.averagePercent}% average · latest {item.latestPercent}%</span><div className="topic-status-chips">{item.topics.map((topic) => <em className={topic.percent >= 75 ? "secure" : topic.percent >= 50 ? "developing" : "needs-work"} key={topic.code}>{topic.code} {topic.percent}%</em>)}</div></article>) : <p>No submitted test data.</p>}</div><div><h3>Recent activity</h3>{user.progress.recentActivities.length ? <ol className="activity-feed">{user.progress.recentActivities.map((activity) => <li key={activity.id}><i/><div><strong>{actionLabel[activity.action] ?? activity.action}</strong><span>{subjectName(activity.subjectId)} {activity.level ?? ""} {activity.paperId ?? ""}</span><small>{new Date(activity.createdAt).toLocaleString("en-GB")}</small></div></li>)}</ol> : <p>No activity events.</p>}</div></div></details>)}</section> : <section className="admin-table"><div className="admin-row head"><span>Account</span><span>Six subjects</span><span>Status</span><span>Premium control</span></div>{visibleUsers.length ? visibleUsers.map((user) => <div className="admin-row" key={user.email}><span><strong>{user.displayName}</strong><small>{user.email}</small></span><span className="subject-chips">{user.selectedSubjects.length ? user.selectedSubjects.map((id) => <em key={id}>{subjectName(id)} {user.subjectLevels?.[id] ?? ""}</em>) : <small>Not selected yet</small>}</span><span><b className={user.premium ? "status-premium" : "status-free"}>{user.premium ? "Premium" : "Free"}</b><small>{user.progress.attemptCount} completed tests</small></span><span><button className={`access-toggle ${user.premium ? "on" : ""}`} disabled={saving === user.email} onClick={() => void setPremium(user, !user.premium)}><i/><strong>{saving === user.email ? "Updating…" : user.premium ? "Premium enabled" : "Grant Premium"}</strong></button></span></div>) : <div className="admin-empty">No matching accounts.</div>}</section>}
      <section className="admin-note"><strong>Safe review workflow & privacy</strong><p>The progress view records navigation and completion status, not students&apos; full written answers. Verify the payment reference with the payment provider before approving it. Payment approval activates Premium immediately; rejecting a request does not remove the account.</p></section>
    </div>
  </div>;
}
