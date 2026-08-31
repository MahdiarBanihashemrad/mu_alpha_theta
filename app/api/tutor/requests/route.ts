import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const statuses = new Set(["pending", "assigned", "confirmed", "completed", "declined"]);

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile?.active) return Response.json({ error: "Not authorized" }, { status: 401 });
  const admin = createSupabaseAdminClient();
  const staffFields = "*,assigned_tutor:profiles!assigned_tutor_id(id,full_name)";
  const tutorFields = "id,status,subject,preferred_date,preferred_time,duration,location,student_name,teacher,notes,assigned_tutor_id,created_at,assigned_tutor:profiles!assigned_tutor_id(id,full_name)";
  let query = admin.from("tutoring_requests").select(profile.role === "tutor" ? tutorFields : staffFields).order("created_at", { ascending: false });
  if (profile.role === "tutor") query = query.eq("assigned_tutor_id", profile.id);
  const { data: requests, error } = await query;
  if (error) return Response.json({ error: "Could not load requests." }, { status: 500 });

  let tutors: unknown[] = [];
  if (profile.role !== "tutor") {
    const result = await admin.from("profiles").select("id,full_name,username,subjects,role").eq("active", true).order("full_name");
    tutors = result.data || [];
  }
  return Response.json({ requests, tutors, role: profile.role });
}

export async function PATCH(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile?.active) return Response.json({ error: "Not authorized" }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" ? body.status : "";
  const assignedTutorId = typeof body.assignedTutorId === "string" && body.assignedTutorId ? body.assignedTutorId : null;
  const officerNotes = typeof body.officerNotes === "string" ? body.officerNotes.trim().slice(0, 1000) : "";
  if (!id || !statuses.has(status)) return Response.json({ error: "Invalid update" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  if (profile.role === "tutor") {
    if (!["confirmed", "completed"].includes(status)) return Response.json({ error: "Tutors can only confirm or complete assigned sessions." }, { status: 403 });
    const { data: existing } = await admin.from("tutoring_requests").select("assigned_tutor_id").eq("id", id).maybeSingle();
    if (existing?.assigned_tutor_id !== profile.id) return Response.json({ error: "Not authorized" }, { status: 403 });
    const { error } = await admin.from("tutoring_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return Response.json({ error: "Could not save request." }, { status: 500 });
  } else {
    const nextStatus = assignedTutorId && status === "pending" ? "assigned" : status;
    const { error } = await admin.from("tutoring_requests").update({ status: nextStatus, assigned_tutor_id: assignedTutorId, officer_notes: officerNotes || null, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return Response.json({ error: "Could not save request." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
