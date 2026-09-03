import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const allowedSubjects = new Set(["Algebra I", "Geometry", "Algebra II", "AP Precalculus", "AP Calculus AB", "AP Calculus BC", "AP Statistics"]);
const allowedDurations = new Set(["45 minutes", "60 minutes", "Other"]);
const allowedTimes = new Set(["7:15 AM", "7:30 AM", "7:45 AM", "8:00 AM", "10:35 AM — FIT", "12:40 PM — Lunch", "4:45 PM", "5:00 PM", "5:15 PM", "5:30 PM", "5:45 PM"]);

function clean(value: unknown, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const subject = clean(body.subject, 60);
    const preferredDate = clean(body.date, 10);
    const preferredTime = clean(body.time, 30);
    const duration = clean(body.duration, 20);
    const selectedLocation = clean(body.location, 40);
    const location = selectedLocation === "Other" ? clean(body.otherLocation, 120) : selectedLocation;
    const studentName = clean(body.name, 100);
    const teacher = clean(body.teacher, 100);
    const email = clean(body.email, 160);
    const phone = clean(body.phone, 40);
    const contactPreference = clean(body.contactPreference, 10);
    const notes = clean(body.notes, 1000);
    const chosenDate = new Date(`${preferredDate}T12:00:00`);
    const validWeekday = !Number.isNaN(chosenDate.getTime()) && chosenDate.getDay() >= 1 && chosenDate.getDay() <= 5;

    if (!allowedSubjects.has(subject) || !allowedTimes.has(preferredTime) || !allowedDurations.has(duration) || !validWeekday || !location || !studentName || !teacher) {
      return Response.json({ error: "Please check the required request details." }, { status: 400 });
    }
    if (!email && !phone) return Response.json({ error: "Please add an email or phone number." }, { status: 400 });
    if (!new Set(["email", "phone"]).has(contactPreference)) return Response.json({ error: "Choose a confirmation method." }, { status: 400 });
    if ((contactPreference === "email" && !email) || (contactPreference === "phone" && !phone)) return Response.json({ error: "Add your preferred contact information." }, { status: 400 });

    const { error } = await createSupabaseAdminClient().from("tutoring_requests").insert({
      subject, preferred_date: preferredDate, preferred_time: preferredTime, duration, location,
      student_name: studentName, teacher, email: email || null, phone: phone || null,
      contact_preference: contactPreference, notes: notes || null,
    });
    if (error) throw error;
    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json({ error: "We could not save your request. Please try again." }, { status: 500 });
  }
}
