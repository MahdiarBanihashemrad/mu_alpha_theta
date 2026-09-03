"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Check, Clock3, Mail, MapPin, Phone, RefreshCw, Settings, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TutorProfile } from "@/lib/auth";

type RequestItem = {
  id: string; status: string; subject: string; preferred_date: string; preferred_time: string; duration: string;
  location: string; student_name: string; teacher: string; email?: string | null; phone?: string | null;
  contact_preference?: string; notes: string | null; assigned_tutor_id: string | null; officer_notes?: string | null;
  created_at: string; assigned_tutor?: { id: string; full_name: string } | null;
};
type TutorOption = { id: string; full_name: string; username: string; subjects: string[]; role: string };

const statusLabels: Record<string, string> = { pending: "Pending", assigned: "Tutor assigned", confirmed: "Confirmed", completed: "Completed", declined: "Declined" };

export default function TutorDashboard({ profile }: { profile: TutorProfile }) {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [tutors, setTutors] = useState<TutorOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const isStaff = profile.role !== "tutor";

  const loadRequests = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/tutor/requests", { cache: "no-store" });
      const result = await response.json() as { requests?: RequestItem[]; tutors?: TutorOption[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Could not load sessions.");
      const nextRequests = result.requests || [];
      setRequests(nextRequests); setTutors(result.tutors || []);
      setSelectedId((current) => {
        const currentRequest = nextRequests.find((item) => item.id === current);
        if (currentRequest && !["completed", "declined"].includes(currentRequest.status)) return current;
        return nextRequests.find((item) => !["completed", "declined"].includes(item.status))?.id || null;
      });
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Could not load sessions."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRequests();
  }, [loadRequests]);

  const visible = useMemo(() => requests.filter((item) => filter === "all" || (filter === "active" ? !["completed", "declined"].includes(item.status) : item.status === filter)), [requests, filter]);
  const selected = requests.find((item) => item.id === selectedId) || null;
  const updateLocal = (field: keyof RequestItem, value: string | null) => setRequests((current) => current.map((item) => item.id === selectedId ? { ...item, [field]: value } : item));

  async function changeStatus(status: string) {
    if (!selected || status === selected.status) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/tutor/requests", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, status, assignedTutorId: selected.assigned_tutor_id, officerNotes: selected.officer_notes }),
      });
      const result = await response.json() as { request?: Pick<RequestItem, "status">; error?: string };
      if (!response.ok || !result.request) throw new Error(result.error || "Could not save this status.");
      setRequests((current) => current.map((item) => item.id === selected.id ? { ...item, status: result.request?.status || status } : item));
      setSelectedId(null);
      await loadRequests();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this status.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSelected() {
    if (!selected) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/tutor/requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selected.id, status: selected.status, assignedTutorId: selected.assigned_tutor_id, officerNotes: selected.officer_notes }) });
      const result = await response.json() as { error?: string; notification?: { status: string; warning?: string } | null };
      if (!response.ok) throw new Error(result.error || "Could not save this session.");
      if (result.notification?.status === "sent") setNotice("Session saved and the tutor was notified by text.");
      else if (result.notification?.status === "not_configured") setNotice("Session saved. SMS is ready but still needs the Twilio settings in Vercel.");
      else if (result.notification?.status === "not_enabled") setNotice("Session saved. This tutor does not have assignment texts enabled.");
      else if (result.notification?.status === "failed") setNotice(`Session saved, but the text could not be sent${result.notification.warning ? `: ${result.notification.warning}` : "."}`);
      else setNotice("Session saved.");
      await loadRequests();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not save this session."); }
    finally { setSaving(false); }
  }

  return (
    <main className="officer-shell">
      <header className="officer-header">
        <div className="officer-header-copy"><Link href="/" className="officer-back"><ArrowLeft /> Back to student site</Link><div className="officer-title-block"><p className="section-label">{isStaff ? "Officer dashboard" : "Tutor View"}</p><h1>{isStaff ? "Tutoring requests" : "Your sessions"}</h1><p>{isStaff ? "Review requests, assign tutors, and track confirmations." : "Everything currently assigned to you, in one place."}</p></div></div>
        <div className="officer-user"><span>Signed in as<br /><strong>{profile.full_name}</strong> · {profile.role}</span>{profile.role === "admin" && <Button asChild variant="outline"><Link href="/tutor/manage"><Settings /> Manage tutors</Link></Button>}<form action="/api/auth/logout" method="post"><button type="submit">Sign out</button></form></div>
      </header>

      <section className="officer-stats"><div><strong>{requests.filter((item) => item.status === "pending").length}</strong><span>Waiting</span></div><div><strong>{requests.filter((item) => ["assigned", "confirmed"].includes(item.status)).length}</strong><span>In progress</span></div><div><strong>{requests.filter((item) => item.status === "completed").length}</strong><span>Completed</span></div></section>

      <section className="dashboard-grid">
        <div className="request-list-panel"><div className="panel-toolbar"><Select value={filter} onValueChange={setFilter}><SelectTrigger aria-label="Filter sessions"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="assigned">Tutor assigned</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="completed">Completed</SelectItem>{isStaff && <SelectItem value="declined">Declined</SelectItem>}<SelectItem value="all">All</SelectItem></SelectContent></Select><Button variant="outline" size="icon" onClick={() => void loadRequests()} aria-label="Refresh"><RefreshCw /></Button></div>
          {loading ? <p className="dashboard-message">Loading…</p> : !visible.length ? <p className="dashboard-message">No sessions in this view yet.</p> : <div className="request-list">{visible.map((item) => <button key={item.id} className={selectedId === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}><span className={`status-dot ${item.status}`} /><span><strong>{item.student_name}</strong><small>{item.subject} · {item.preferred_date}</small></span><em>{item.preferred_time}</em></button>)}</div>}
        </div>

        <div className="request-detail-panel">{!selected ? <p className="dashboard-message">Select a session to see its details.</p> : <>
          <div className="detail-heading"><div><span className={`status-badge ${selected.status}`}>{statusLabels[selected.status]}</span><h2>{selected.student_name}</h2><p>{selected.subject} · {selected.teacher}</p></div><span>Requested {new Date(selected.created_at).toLocaleDateString()}</span></div>
          <div className="detail-facts"><div><CalendarDays /><span><small>Date</small>{selected.preferred_date}</span></div><div><Clock3 /><span><small>Time</small>{selected.preferred_time} · {selected.duration}</span></div><div><MapPin /><span><small>Location</small>{selected.location}</span></div><div><UserRound /><span><small>Teacher</small>{selected.teacher}</span></div></div>
          {isStaff && (selected.email || selected.phone) && <div className="contact-card">{selected.email && <a href={`mailto:${selected.email}`}><Mail />{selected.email}</a>}{selected.phone && <a href={`tel:${selected.phone}`}><Phone />{selected.phone}</a>}<small>Prefers {selected.contact_preference}</small></div>}
          {selected.notes && <div className="student-notes"><strong>Student’s note</strong><p>{selected.notes}</p></div>}
          <div className="officer-fields">
            <label>Status<Select value={selected.status} onValueChange={(value) => void changeStatus(value)} disabled={saving}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(isStaff ? Object.entries(statusLabels) : Object.entries(statusLabels).filter(([value]) => ["confirmed", "completed"].includes(value))).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></label>
            {isStaff && <label>Assigned tutor<Select value={selected.assigned_tutor_id || "unassigned"} onValueChange={(value) => updateLocal("assigned_tutor_id", value === "unassigned" ? null : value)}><SelectTrigger><SelectValue placeholder="Choose a tutor" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{tutors.map((tutor) => <SelectItem key={tutor.id} value={tutor.id}>{tutor.full_name} · @{tutor.username}</SelectItem>)}</SelectContent></Select></label>}
            {isStaff && <label>Officer notes<Textarea value={selected.officer_notes || ""} onChange={(event) => updateLocal("officer_notes", event.target.value)} /></label>}
            {error && <p className="form-error">{error}</p>}{notice && <p className="success-message">{notice}</p>}<Button className="nav-cta" onClick={() => void saveSelected()} disabled={saving}>{saving ? "Saving…" : <><Check /> Save session</>}</Button>
          </div>
        </>}</div>
      </section>
    </main>
  );
}
