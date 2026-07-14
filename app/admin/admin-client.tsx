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

type PremiumRequest = {
  id: number; amountKrw: number; paymentMethod: string; payerName: string; paymentReference: string;
  note: string; status: "pending" | "approved" | "rejected"; adminNote: string; createdAt: string; reviewedAt: string | null;
};
type UserRow = {
  email: string; displayName: string; premium: boolean; selectedSubjects: string[]; subjectLevels: Record<string, "SL" | "HL">;
  premiumRequest: PremiumRequest | null; createdAt: string; updatedAt: string;
};

const paymentMethodName = (value: string) => value === "bank_transfer" ? "Bank transfer" : value === "paypal" ? "PayPal" : "Other";

export default function AdminClient({ adminName, embedded = false, onBack }: { adminName: string; embedded?: boolean; onBack?: () => void }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});

  useEffect(() => {
    let active = true;
    adminFetch("/api/admin/users", { cache: "no-store" }).then(async (response) => {
      const data = await response.json() as { users?: UserRow[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Admin account list could not be loaded.");
      return data.users ?? [];
    }).then((rows) => { if (active) setUsers(rows); }).catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : "Admin account list could not be loaded."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const visibleUsers = useMemo(() => users.filter((user) => `${user.displayName} ${user.email} ${user.premiumRequest?.payerName ?? ""} ${user.premiumRequest?.paymentReference ?? ""}`.toLowerCase().includes(query.toLowerCase())), [users, query]);

  const setPremium = async (target: UserRow, premium: boolean) => {
    setSaving(target.email); setMessage("");
    const response = await adminFetch("/api/admin/users", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: target.email, premium }) });
    const data = await response.json() as { error?: string };
    if (response.ok) {
      setUsers((rows) => rows.map((row) => row.email === target.email ? { ...row, premium } : row));
      setMessage(`${target.displayName} now has ${premium ? "Premium" : "Free"} access.`);
    } else setMessage(data.error ?? "The account could not be updated.");
    setSaving(null);
  };

  const reviewRequest = async (target: UserRow, action: "approve" | "reject") => {
    if (!target.premiumRequest) return;
    setSaving(target.email); setMessage("");
    const response = await adminFetch("/api/admin/users", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: target.premiumRequest.id, action, adminNote: reviewNotes[target.premiumRequest.id] ?? "" }) });
    const data = await response.json() as { premiumRequest?: PremiumRequest; premium?: boolean; error?: string };
    if (response.ok && data.premiumRequest) {
      setUsers((rows) => rows.map((row) => row.email === target.email ? { ...row, premium: action === "approve" ? true : row.premium, premiumRequest: data.premiumRequest! } : row));
      setMessage(`${target.displayName}'s payment was ${action === "approve" ? "accepted and Premium was enabled" : "rejected"}.`);
    } else setMessage(data.error ?? "The payment review could not be completed.");
    setSaving(null);
  };

  const pendingCount = users.filter((user) => user.premiumRequest?.status === "pending").length;
  return <div className={`admin-page ${embedded ? "embedded-admin" : ""}`}>
    {!embedded && <header className="admin-topbar"><Link className="brand" href="/"><BrandLockup light/></Link><div><span>Signed in as {adminName}</span><Link className="quiet-button" href="/">Student site</Link></div></header>}
    <div className="admin-container">
      {embedded && <button className="back-link" onClick={onBack}>← Dashboard</button>}
      <section className="admin-hero"><div><span className="eyebrow">ADMIN CONSOLE</span><h1>Premium reviews</h1><p>Verify the payment reference outside this site, then approve or reject the request. Premium starts only after approval.</p></div><div className="admin-stats"><div><strong>{users.length}</strong><span>Accounts</span></div><div><strong>{pendingCount}</strong><span>Pending</span></div><div><strong>{users.filter((user) => user.premium).length}</strong><span>Premium</span></div><div><strong>{users.filter((user) => user.selectedSubjects.length === 6).length}</strong><span>Set up</span></div></div></section>
      <section className="admin-controls"><label><span>Search accounts or payment reference</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Username, payer or reference" /></label>{message && <p role="status">{message}</p>}</section>
      <section className="admin-table"><div className="admin-row head"><span>Account</span><span>Six subjects</span><span>Payment review</span><span>Access</span></div>{loading ? <div className="admin-empty">Loading accounts…</div> : visibleUsers.length ? visibleUsers.map((user) => {
        const request = user.premiumRequest;
        return <div className="admin-row" key={user.email}>
          <span><strong>{user.displayName}</strong><small>{user.email}</small><b className={user.premium ? "status-premium" : "status-free"}>{user.premium ? "Premium" : "Free"}</b></span>
          <span className="subject-chips">{user.selectedSubjects.length ? user.selectedSubjects.map((id) => <em key={id}>{subjectCatalog.find((subject) => subject.id === id)?.name ?? id} {user.subjectLevels?.[id] ?? ""}</em>) : <small>Not selected yet</small>}</span>
          <span className="payment-review">{request ? <><b className={`request-status ${request.status}`}>{request.status}</b><strong>₩{request.amountKrw.toLocaleString()} · {paymentMethodName(request.paymentMethod)}</strong><small>Payer: {request.payerName}</small><code>{request.paymentReference}</code>{request.note && <small>Student note: {request.note}</small>}{request.status === "pending" ? <><input value={reviewNotes[request.id] ?? ""} onChange={(event) => setReviewNotes((notes) => ({ ...notes, [request.id]: event.target.value }))} placeholder="Optional admin note" maxLength={500}/><div className="review-actions"><button disabled={saving === user.email} onClick={() => void reviewRequest(user, "approve")}>Accept payment</button><button disabled={saving === user.email} onClick={() => void reviewRequest(user, "reject")}>Reject</button></div></> : request.adminNote && <small>Admin note: {request.adminNote}</small>}</> : <small>No Premium application</small>}</span>
          <span><button className={`access-toggle ${user.premium ? "on" : ""}`} disabled={saving === user.email} onClick={() => void setPremium(user, !user.premium)}><i/><strong>{saving === user.email ? "Updating…" : user.premium ? "Premium enabled" : "Manual grant"}</strong></button><small>Manual control is available for support cases.</small></span>
        </div>;
      }) : <div className="admin-empty">No matching accounts.</div>}</section>
      <section className="admin-note"><strong>Safe review workflow</strong><p>The site does not process cards or confirm money automatically. Match the payer, amount and reference against your payment provider first. Accepting a pending request enables Premium; rejecting it leaves the account Free and allows the student to submit a corrected application.</p></section>
    </div>
  </div>;
}
