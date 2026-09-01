"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, KeyRound, Pencil, Plus, RefreshCw, ShieldCheck, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const subjectOptions = ["Algebra I", "Geometry", "Algebra II", "AP Precalculus", "AP Calculus AB", "AP Calculus BC", "AP Statistics"];
type Tutor = {
  id: string; username: string; full_name: string; school_email: string; role: string; subjects: string[];
  active: boolean; must_change_password: boolean; uses_internal_login: boolean;
};
type EditForm = {
  fullName: string; username: string; schoolEmail: string; role: string; subjects: string[];
  active: boolean; temporaryPassword: string;
};

function editValues(tutor: Tutor): EditForm {
  return {
    fullName: tutor.full_name, username: tutor.username, schoolEmail: tutor.school_email,
    role: tutor.role, subjects: tutor.subjects || [], active: tutor.active, temporaryPassword: "",
  };
}

export default function ManageTutors() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [form, setForm] = useState({ fullName: "", username: "", schoolEmail: "", role: "tutor", temporaryPassword: "", subjects: [] as string[] });
  const [editing, setEditing] = useState<Tutor | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSaving, setEditingSaving] = useState(false);

  const loadTutors = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/tutors", { cache: "no-store" });
      const result = await response.json() as { tutors?: Tutor[]; error?: string };
      if (!response.ok) throw new Error(result.error);
      setTutors(result.tutors || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load tutors.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTutors();
  }, [loadTutors]);

  async function createTutor(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/tutors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error);
      setMessage(`${form.fullName} can now sign in with @${form.username} and their temporary password. No email was sent.`);
      setForm({ fullName: "", username: "", schoolEmail: "", role: "tutor", temporaryPassword: "", subjects: [] });
      await loadTutors();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create tutor.");
    } finally {
      setSaving(false);
    }
  }

  async function patchTutor(tutor: Tutor, update: Record<string, unknown>) {
    setError(""); setMessage("");
    const response = await fetch("/api/admin/tutors", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: tutor.id, ...update }),
    });
    const result = await response.json() as { error?: string; password_reset?: boolean };
    if (!response.ok) throw new Error(result.error || "Could not update tutor.");
    return result;
  }

  async function quickUpdate(tutor: Tutor, update: Partial<Tutor>) {
    try {
      await patchTutor(tutor, update);
      setTutors((current) => current.map((item) => item.id === tutor.id ? { ...item, ...update } : item));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update tutor.");
    }
  }

  function openEditor(tutor: Tutor) {
    setEditing(tutor); setEditForm(editValues(tutor)); setError(""); setMessage("");
  }

  async function saveTutor(event: FormEvent) {
    event.preventDefault();
    if (!editing || !editForm) return;
    setEditingSaving(true); setError(""); setMessage("");
    try {
      const result = await patchTutor(editing, editForm);
      setMessage(result.password_reset
        ? `${editForm.fullName}'s details were updated and a new temporary password was issued.`
        : `${editForm.fullName}'s account details were updated.`);
      setEditing(null); setEditForm(null);
      await loadTutors();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update tutor.");
    } finally {
      setEditingSaving(false);
    }
  }

  return (
    <main className="manage-shell">
      <header>
        <Link href="/tutor" className="officer-back"><ArrowLeft /> Back to requests</Link>
        <p className="section-label">Administrator tools</p><h1>Manage tutors</h1>
        <p>Create accounts, edit tutor details, reset temporary passwords, and control access.</p>
      </header>
      <section className="manage-grid">
        <form className="create-tutor-card" onSubmit={createTutor}>
          <span className="auth-icon"><Plus /></span><h2>Add an approved tutor</h2>
          <label>Full name<Input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
          <div className="field-pair">
            <label>Username<Input placeholder="jordan.lee" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
            <label>Access level<Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tutor">Tutor</SelectItem><SelectItem value="officer">Officer</SelectItem><SelectItem value="admin">Administrator</SelectItem></SelectContent></Select></label>
          </div>
          <label>School email <span>(optional record only)</span><Input type="email" value={form.schoolEmail} onChange={(event) => setForm({ ...form, schoolEmail: event.target.value })} /></label>
          <p className="account-note">Email is not used for sign-in, verification, or account delivery. Give the tutor their username and password directly.</p>
          <label>Unique temporary password<Input type="password" autoComplete="new-password" value={form.temporaryPassword} onChange={(event) => setForm({ ...form, temporaryPassword: event.target.value })} /></label>
          <p className="password-rules">10+ characters with uppercase, lowercase, a number, and a symbol. The tutor must replace it after signing in.</p>
          <fieldset className="subject-checks"><legend>Subjects they tutor</legend>{subjectOptions.map((subject) => <label key={subject}><Checkbox checked={form.subjects.includes(subject)} onCheckedChange={(checked) => setForm({ ...form, subjects: checked ? [...form.subjects, subject] : form.subjects.filter((item) => item !== subject) })} />{subject}</label>)}</fieldset>
          {error && <p className="form-error">{error}</p>}{message && <p className="success-message">{message}</p>}
          <Button className="nav-cta" disabled={saving}>{saving ? "Creating…" : "Create tutor account"}</Button>
        </form>

        <div className="tutor-roster-card">
          <div className="roster-heading"><div><h2>Approved accounts</h2><p>{tutors.length} people</p></div><Button variant="outline" size="icon" onClick={() => void loadTutors()}><RefreshCw /><span className="sr-only">Refresh tutors</span></Button></div>
          {message && <p className="success-message roster-message">{message}</p>}
          {error && <p className="form-error roster-message">{error}</p>}
          {loading ? <p className="dashboard-message">Loading roster…</p> : (
            <div className="tutor-roster">{tutors.map((tutor) => (
              <article key={tutor.id} className={!tutor.active ? "inactive" : ""}>
                <span className="roster-avatar">{tutor.role === "admin" ? <ShieldCheck /> : <UserRound />}</span>
                <div><strong>{tutor.full_name}</strong><small>@{tutor.username}{tutor.school_email ? ` · ${tutor.school_email}` : ""}</small>{tutor.must_change_password && <em>Temporary password active</em>}</div>
                <Select value={tutor.role} onValueChange={(role) => void quickUpdate(tutor, { role })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tutor">Tutor</SelectItem><SelectItem value="officer">Officer</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select>
                <Button type="button" variant="outline" size="sm" onClick={() => openEditor(tutor)}><Pencil /> Details</Button>
                <button className="status-toggle" onClick={() => void quickUpdate(tutor, { active: !tutor.active })}>{tutor.active ? "Deactivate" : "Reactivate"}</button>
              </article>
            ))}</div>
          )}
        </div>
      </section>

      <Dialog open={Boolean(editing && editForm)} onOpenChange={(open) => { if (!open) { setEditing(null); setEditForm(null); } }}>
        <DialogContent className="tutor-editor">
          <DialogHeader><DialogTitle>Tutor account details</DialogTitle><DialogDescription>Edit visible profile information or issue a new temporary password. Existing passwords are never viewable.</DialogDescription></DialogHeader>
          {editing && editForm && (
            <form onSubmit={saveTutor} className="tutor-editor-form">
              <div className="field-pair">
                <label>Full name<Input value={editForm.fullName} onChange={(event) => setEditForm({ ...editForm, fullName: event.target.value })} /></label>
                <label>Username<Input value={editForm.username} onChange={(event) => setEditForm({ ...editForm, username: event.target.value })} /></label>
              </div>
              <div className="field-pair">
                <label>School email <span>(optional)</span><Input type="email" value={editForm.schoolEmail} onChange={(event) => setEditForm({ ...editForm, schoolEmail: event.target.value })} /></label>
                <label>Access level<Select value={editForm.role} onValueChange={(role) => setEditForm({ ...editForm, role })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tutor">Tutor</SelectItem><SelectItem value="officer">Officer</SelectItem><SelectItem value="admin">Administrator</SelectItem></SelectContent></Select></label>
              </div>
              <fieldset className="subject-checks"><legend>Subjects they tutor</legend>{subjectOptions.map((subject) => <label key={subject}><Checkbox checked={editForm.subjects.includes(subject)} onCheckedChange={(checked) => setEditForm({ ...editForm, subjects: checked ? [...editForm.subjects, subject] : editForm.subjects.filter((item) => item !== subject) })} />{subject}</label>)}</fieldset>
              <label className="password-reset-label"><KeyRound /> New temporary password <span>(leave blank to keep current password)</span><Input type="password" autoComplete="new-password" value={editForm.temporaryPassword} onChange={(event) => setEditForm({ ...editForm, temporaryPassword: event.target.value })} /></label>
              <label className="active-account"><Checkbox checked={editForm.active} onCheckedChange={(checked) => setEditForm({ ...editForm, active: Boolean(checked) })} /> Account active</label>
              {error && <p className="form-error">{error}</p>}
              <DialogFooter><Button type="button" variant="outline" onClick={() => { setEditing(null); setEditForm(null); }}>Cancel</Button><Button type="submit" className="nav-cta" disabled={editingSaving}>{editingSaving ? "Saving…" : "Save account"}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
