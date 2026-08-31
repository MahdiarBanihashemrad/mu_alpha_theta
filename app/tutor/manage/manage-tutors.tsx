"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, Plus, RefreshCw, ShieldCheck, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const subjectOptions = ["Algebra I", "Geometry", "Algebra II", "AP Precalculus", "AP Calculus AB", "AP Calculus BC", "AP Statistics"];
type Tutor = { id: string; s_number: string; full_name: string; school_email: string; role: string; subjects: string[]; active: boolean; must_change_password: boolean };

export default function ManageTutors() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [form, setForm] = useState({ fullName: "", sNumber: "", schoolEmail: "", role: "tutor", temporaryPassword: "", subjects: [] as string[] });
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);

  const loadTutors = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await fetch("/api/admin/tutors", { cache: "no-store" }); const result = await response.json() as { tutors?: Tutor[]; error?: string }; if (!response.ok) throw new Error(result.error); setTutors(result.tutors || []); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Could not load tutors."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTutors();
  }, [loadTutors]);

  async function createTutor(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try { const response = await fetch("/api/admin/tutors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error); setMessage(`${form.fullName} can now sign in with their S-number and temporary password.`); setForm({ fullName: "", sNumber: "", schoolEmail: "", role: "tutor", temporaryPassword: "", subjects: [] }); await loadTutors(); }
    catch (createError) { setError(createError instanceof Error ? createError.message : "Could not create tutor."); }
    finally { setSaving(false); }
  }

  async function updateTutor(tutor: Tutor, update: Partial<Tutor>) {
    setError("");
    const next = { ...tutor, ...update };
    const response = await fetch("/api/admin/tutors", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: tutor.id, role: next.role, active: next.active }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) return setError(result.error || "Could not update tutor.");
    setTutors((current) => current.map((item) => item.id === tutor.id ? next : item));
  }

  return (
    <main className="manage-shell">
      <header><Link href="/tutor" className="officer-back"><ArrowLeft /> Back to requests</Link><p className="section-label">Administrator tools</p><h1>Manage tutors</h1><p>Create accounts, choose access levels, and deactivate former tutors.</p></header>
      <section className="manage-grid">
        <form className="create-tutor-card" onSubmit={createTutor}><span className="auth-icon"><Plus /></span><h2>Add an approved tutor</h2>
          <label>Full name<Input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
          <div className="field-pair"><label>S-number<Input placeholder="S123456" value={form.sNumber} onChange={(event) => setForm({ ...form, sNumber: event.target.value })} /></label><label>Access level<Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tutor">Tutor</SelectItem><SelectItem value="officer">Officer</SelectItem><SelectItem value="admin">Administrator</SelectItem></SelectContent></Select></label></div>
          <label>School email<Input type="email" value={form.schoolEmail} onChange={(event) => setForm({ ...form, schoolEmail: event.target.value })} /></label>
          <label>Unique temporary password<Input type="password" value={form.temporaryPassword} onChange={(event) => setForm({ ...form, temporaryPassword: event.target.value })} /></label>
          <fieldset className="subject-checks"><legend>Subjects they tutor</legend>{subjectOptions.map((subject) => <label key={subject}><Checkbox checked={form.subjects.includes(subject)} onCheckedChange={(checked) => setForm({ ...form, subjects: checked ? [...form.subjects, subject] : form.subjects.filter((item) => item !== subject) })} />{subject}</label>)}</fieldset>
          {error && <p className="form-error">{error}</p>}{message && <p className="success-message">{message}</p>}<Button className="nav-cta" disabled={saving}>{saving ? "Creating…" : "Create tutor account"}</Button>
        </form>
        <div className="tutor-roster-card"><div className="roster-heading"><div><h2>Approved accounts</h2><p>{tutors.length} people</p></div><Button variant="outline" size="icon" onClick={() => void loadTutors()}><RefreshCw /></Button></div>
          {loading ? <p className="dashboard-message">Loading roster…</p> : <div className="tutor-roster">{tutors.map((tutor) => <article key={tutor.id} className={!tutor.active ? "inactive" : ""}><span className="roster-avatar">{tutor.role === "admin" ? <ShieldCheck /> : <UserRound />}</span><div><strong>{tutor.full_name}</strong><small>{tutor.s_number} · {tutor.school_email}</small>{tutor.must_change_password && <em>Temporary password active</em>}</div><Select value={tutor.role} onValueChange={(role) => void updateTutor(tutor, { role })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tutor">Tutor</SelectItem><SelectItem value="officer">Officer</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select><button className="status-toggle" onClick={() => void updateTutor(tutor, { active: !tutor.active })}>{tutor.active ? "Deactivate" : "Reactivate"}</button></article>)}</div>}
        </div>
      </section>
    </main>
  );
}
