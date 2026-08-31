import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const subjects = new Set(["Algebra I", "Geometry", "Algebra II", "AP Precalculus", "AP Calculus AB", "AP Calculus BC", "AP Statistics"]);
const roles = new Set(["tutor", "officer", "admin"]);

function normalizeSNumber(value: unknown) {
  const cleaned = typeof value === "string" ? value.trim().toUpperCase().replace(/\s/g, "") : "";
  return cleaned.startsWith("S") ? cleaned : `S${cleaned}`;
}

export async function GET() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin" || !profile.active) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const { data, error } = await createSupabaseAdminClient().from("profiles").select("id,s_number,full_name,school_email,role,subjects,active,must_change_password,created_at").order("full_name");
  if (error) return Response.json({ error: "Could not load tutors." }, { status: 500 });
  return Response.json({ tutors: data });
}

export async function POST(request: Request) {
  const requester = await getCurrentProfile();
  if (requester?.role !== "admin" || !requester.active) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const sNumber = normalizeSNumber(body.sNumber);
  const fullName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 100) : "";
  const schoolEmail = typeof body.schoolEmail === "string" ? body.schoolEmail.trim().toLowerCase().slice(0, 160) : "";
  const role = typeof body.role === "string" ? body.role : "tutor";
  const temporaryPassword = typeof body.temporaryPassword === "string" ? body.temporaryPassword : "";
  const selectedSubjects = Array.isArray(body.subjects) ? body.subjects.filter((item): item is string => typeof item === "string" && subjects.has(item)) : [];

  if (!/^S[0-9]{5,10}$/.test(sNumber) || !fullName || !/^\S+@\S+\.\S+$/.test(schoolEmail) || !roles.has(role)) return Response.json({ error: "Check the tutor’s name, S-number, email, and role." }, { status: 400 });
  if (temporaryPassword.length < 10 || !/[a-z]/.test(temporaryPassword) || !/[A-Z]/.test(temporaryPassword) || !/[0-9]/.test(temporaryPassword) || !/[^A-Za-z0-9]/.test(temporaryPassword)) {
    return Response.json({ error: "Temporary passwords need 10+ characters with uppercase, lowercase, a number, and a symbol." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: schoolEmail, password: temporaryPassword, email_confirm: true,
    app_metadata: { role }, user_metadata: { full_name: fullName },
  });
  if (authError || !created.user) return Response.json({ error: authError?.message || "Could not create account." }, { status: 400 });

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id, s_number: sNumber, full_name: fullName, school_email: schoolEmail,
    login_email: schoolEmail, role, subjects: selectedSubjects, active: true, must_change_password: true,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return Response.json({ error: profileError.message }, { status: 400 });
  }
  return Response.json({ ok: true }, { status: 201 });
}

export async function PATCH(request: Request) {
  const requester = await getCurrentProfile();
  if (requester?.role !== "admin" || !requester.active) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  const role = typeof body.role === "string" ? body.role : "";
  const active = typeof body.active === "boolean" ? body.active : null;
  if (!id || !roles.has(role) || active === null || id === requester.id && (!active || role !== "admin")) {
    return Response.json({ error: "Invalid account update." }, { status: 400 });
  }
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("profiles").update({ role, active, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return Response.json({ error: "Could not update account." }, { status: 500 });
  await admin.auth.admin.updateUserById(id, { app_metadata: { role } });
  return Response.json({ ok: true });
}
