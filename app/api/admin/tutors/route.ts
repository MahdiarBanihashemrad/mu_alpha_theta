import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const subjects = new Set(["Algebra I", "Geometry", "Algebra II", "AP Precalculus", "AP Calculus AB", "AP Calculus BC", "AP Statistics"]);
const roles = new Set(["tutor", "officer", "admin"]);

function normalizeUsername(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 160) : "";
}

function normalizePhone(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  const raw = value.trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return raw.slice(0, 30);
}

function validPassword(value: string) {
  return value.length >= 10 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
}

function internalLoginEmail(username: string) {
  return `${username}@tutors.invalid`;
}

export async function GET() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin" || !profile.active) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const { data, error } = await createSupabaseAdminClient().from("profiles").select("id,username,full_name,school_email,login_email,phone,sms_notifications,role,subjects,active,must_change_password,created_at").order("full_name");
  if (error) return Response.json({ error: "Could not load tutors." }, { status: 500 });
  return Response.json({
    tutors: (data || []).map(({ login_email, ...tutor }) => ({
      ...tutor,
      school_email: tutor.school_email.endsWith("@tutors.invalid") ? "" : tutor.school_email,
      uses_internal_login: login_email.endsWith("@tutors.invalid"),
    })),
  });
}

export async function POST(request: Request) {
  const requester = await getCurrentProfile();
  if (requester?.role !== "admin" || !requester.active) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const username = normalizeUsername(body.username);
  const fullName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 100) : "";
  const schoolEmail = normalizeEmail(body.schoolEmail);
  const phone = normalizePhone(body.phone);
  const smsNotifications = body.smsNotifications === true;
  const role = typeof body.role === "string" ? body.role : "tutor";
  const temporaryPassword = typeof body.temporaryPassword === "string" ? body.temporaryPassword : "";
  const selectedSubjects = Array.isArray(body.subjects) ? body.subjects.filter((item): item is string => typeof item === "string" && subjects.has(item)) : [];

  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username) || !fullName || !roles.has(role)) return Response.json({ error: "Use a unique username with letters, numbers, dots, underscores, or hyphens." }, { status: 400 });
  if (schoolEmail && !/^\S+@\S+\.\S+$/.test(schoolEmail)) return Response.json({ error: "Enter a valid email or leave it blank." }, { status: 400 });
  if (phone && !/^\+[1-9][0-9]{7,14}$/.test(phone)) return Response.json({ error: "Enter a valid phone number, including its area code." }, { status: 400 });
  if (smsNotifications && !phone) return Response.json({ error: "Add a phone number before enabling assignment texts." }, { status: 400 });
  if (!validPassword(temporaryPassword)) return Response.json({ error: "Temporary passwords need 10+ characters with uppercase, lowercase, a number, and a symbol." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const loginEmail = internalLoginEmail(username);
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: loginEmail, password: temporaryPassword, email_confirm: true,
    app_metadata: { role }, user_metadata: { full_name: fullName },
  });
  if (authError || !created.user) return Response.json({ error: authError?.message || "Could not create account." }, { status: 400 });

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id, username, full_name: fullName, school_email: schoolEmail || loginEmail,
    login_email: loginEmail, phone: phone || null, sms_notifications: smsNotifications,
    role, subjects: selectedSubjects, active: true, must_change_password: true,
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
  if (!id) return Response.json({ error: "Invalid account update." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: current, error: loadError } = await admin.from("profiles").select("id,username,full_name,school_email,login_email,phone,sms_notifications,role,subjects,active").eq("id", id).maybeSingle();
  if (loadError || !current) return Response.json({ error: "Tutor account not found." }, { status: 404 });

  const username = body.username === undefined ? current.username : normalizeUsername(body.username);
  const fullName = body.fullName === undefined ? current.full_name : typeof body.fullName === "string" ? body.fullName.trim().slice(0, 100) : "";
  const schoolEmail = body.schoolEmail === undefined ? current.school_email : normalizeEmail(body.schoolEmail) || current.login_email;
  const phone = body.phone === undefined ? current.phone : normalizePhone(body.phone) || null;
  const smsNotifications = body.smsNotifications === undefined ? current.sms_notifications : body.smsNotifications === true;
  const role = body.role === undefined ? current.role : typeof body.role === "string" ? body.role : "";
  const active = body.active === undefined ? current.active : typeof body.active === "boolean" ? body.active : null;
  const selectedSubjects = body.subjects === undefined ? current.subjects : Array.isArray(body.subjects) ? body.subjects.filter((item): item is string => typeof item === "string" && subjects.has(item)) : [];
  const temporaryPassword = typeof body.temporaryPassword === "string" ? body.temporaryPassword : "";

  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username) || !fullName || !roles.has(role) || active === null) return Response.json({ error: "Check the account details and try again." }, { status: 400 });
  if (schoolEmail !== current.login_email && !/^\S+@\S+\.\S+$/.test(schoolEmail)) return Response.json({ error: "Enter a valid email or leave it blank." }, { status: 400 });
  if (phone && !/^\+[1-9][0-9]{7,14}$/.test(phone)) return Response.json({ error: "Enter a valid phone number, including its area code." }, { status: 400 });
  if (smsNotifications && !phone) return Response.json({ error: "Add a phone number before enabling assignment texts." }, { status: 400 });
  if (id === requester.id && (!active || role !== "admin")) return Response.json({ error: "You cannot deactivate or demote your own administrator account." }, { status: 400 });
  if (temporaryPassword && !validPassword(temporaryPassword)) return Response.json({ error: "Temporary passwords need 10+ characters with uppercase, lowercase, a number, and a symbol." }, { status: 400 });

  const authUpdate: { app_metadata: { role: string }; user_metadata: { full_name: string }; password?: string } = {
    app_metadata: { role }, user_metadata: { full_name: fullName },
  };
  if (temporaryPassword) authUpdate.password = temporaryPassword;
  const { error: authError } = await admin.auth.admin.updateUserById(id, authUpdate);
  if (authError) return Response.json({ error: authError.message || "Could not update authentication details." }, { status: 400 });

  const update = {
    username, full_name: fullName, school_email: schoolEmail, phone, sms_notifications: smsNotifications,
    role, subjects: selectedSubjects, active,
    must_change_password: temporaryPassword ? true : undefined,
    updated_at: new Date().toISOString(),
  };
  const profileUpdate = Object.fromEntries(Object.entries(update).filter(([, value]) => value !== undefined));
  const { error } = await admin.from("profiles").update(profileUpdate).eq("id", id);
  if (error) return Response.json({ error: error.message || "Could not update account." }, { status: 400 });
  return Response.json({ ok: true, password_reset: Boolean(temporaryPassword) });
}

export async function DELETE(request: Request) {
  const requester = await getCurrentProfile();
  if (requester?.role !== "admin" || !requester.active) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return Response.json({ error: "Choose a tutor account to delete." }, { status: 400 });
  if (id === requester.id) return Response.json({ error: "You cannot delete your own administrator account." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: tutor, error: loadError } = await admin.from("profiles").select("id,full_name").eq("id", id).maybeSingle();
  if (loadError || !tutor) return Response.json({ error: "Tutor account not found." }, { status: 404 });

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return Response.json({ error: error.message || "Could not delete this account." }, { status: 400 });
  return Response.json({ ok: true, deleted: { id: tutor.id, full_name: tutor.full_name } });
}
