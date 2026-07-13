"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { subjectCatalog } from "../data";
import { BrandLockup } from "../logo";

type UserRow = {
  email: string; displayName: string; premium: boolean; selectedSubjects: string[];
  createdAt: string; updatedAt: string;
};

export default function AdminClient({ adminName }: { adminName: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/users", { cache: "no-store" }).then((response) => response.json()).then((data: { users?: UserRow[]; error?: string }) => {
      if (!active) return;
      if (data.error) setMessage(data.error);
      setUsers(data.users ?? []);
      setLoading(false);
    }).catch(() => { if (active) { setMessage("Admin account list could not be loaded."); setLoading(false); } });
    return () => { active = false; };
  }, []);
  const visibleUsers = useMemo(() => users.filter((user) => `${user.displayName} ${user.email}`.toLowerCase().includes(query.toLowerCase())), [users, query]);

  const setPremium = async (target: UserRow, premium: boolean) => {
    setSaving(target.email); setMessage("");
    const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: target.email, premium }) });
    if (response.ok) {
      setUsers((rows) => rows.map((row) => row.email === target.email ? { ...row, premium } : row));
      setMessage(`${target.displayName} now has ${premium ? "Premium" : "Free"} access.`);
    } else {
      const data = await response.json() as { error?: string };
      setMessage(data.error ?? "The account could not be updated.");
    }
    setSaving(null);
  };

  return <main className="admin-page">
    <header className="admin-topbar"><Link className="brand" href="/"><BrandLockup light/></Link><div><span>Signed in as {adminName}</span><Link className="quiet-button" href="/">Student site</Link></div></header>
    <div className="admin-container">
      <section className="admin-hero"><div><span className="eyebrow">ADMIN CONSOLE</span><h1>Account access</h1><p>Approve or remove Premium for any account that has signed in to the student site.</p></div><div className="admin-stats"><div><strong>{users.length}</strong><span>Accounts</span></div><div><strong>{users.filter((user) => user.premium).length}</strong><span>Premium</span></div><div><strong>{users.filter((user) => user.selectedSubjects.length === 6).length}</strong><span>Set up</span></div></div></section>
      <section className="admin-controls"><label><span>Search accounts</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or email address" /></label>{message && <p>{message}</p>}</section>
      <section className="admin-table"><div className="admin-row head"><span>Account</span><span>Six subjects</span><span>Status</span><span>Premium control</span></div>{loading ? <div className="admin-empty">Loading accounts…</div> : visibleUsers.length ? visibleUsers.map((user) => <div className="admin-row" key={user.email}><span><strong>{user.displayName}</strong><small>{user.email}</small></span><span className="subject-chips">{user.selectedSubjects.length ? user.selectedSubjects.map((id) => <em key={id}>{subjectCatalog.find((subject) => subject.id === id)?.name ?? id}</em>) : <small>Not selected yet</small>}</span><span><b className={user.premium ? "status-premium" : "status-free"}>{user.premium ? "Premium" : "Free"}</b><small>Updated {new Date(user.updatedAt).toLocaleDateString("en-GB")}</small></span><span><button className={`access-toggle ${user.premium ? "on" : ""}`} disabled={saving === user.email} onClick={() => void setPremium(user, !user.premium)}><i/><strong>{saving === user.email ? "Updating…" : user.premium ? "Premium enabled" : "Grant Premium"}</strong></button></span></div>) : <div className="admin-empty">No matching accounts.</div>}</section>
      <section className="admin-note"><strong>How Premium approval works</strong><p>When Premium is enabled here, the student account receives the Premium Access badge, monthly tests, reports, revision queue and mistake bank on its next refresh. Disabling it keeps historical attempts but locks Premium views.</p></section>
    </div>
  </main>;
}
