import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeSNumber(value: unknown) {
  const cleaned = typeof value === "string" ? value.trim().toUpperCase().replace(/\s/g, "") : "";
  return cleaned.startsWith("S") ? cleaned : `S${cleaned}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { sNumber?: string; password?: string };
    const sNumber = normalizeSNumber(body.sNumber);
    const password = body.password || "";
    if (!/^S[0-9]{5,10}$/.test(sNumber) || !password) {
      return Response.json({ error: "Incorrect S-number or password." }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data: profile } = await admin.from("profiles").select("login_email,active,must_change_password").eq("s_number", sNumber).maybeSingle();
    if (!profile?.active) return Response.json({ error: "Incorrect S-number or password." }, { status: 401 });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email: profile.login_email, password });
    if (error) return Response.json({ error: "Incorrect S-number or password." }, { status: 401 });
    return Response.json({ ok: true, redirectTo: profile.must_change_password ? "/tutor/change-password" : "/tutor" });
  } catch {
    return Response.json({ error: "Login is temporarily unavailable." }, { status: 500 });
  }
}
