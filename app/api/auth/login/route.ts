import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeUsername(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { username?: string; password?: string };
    const username = normalizeUsername(body.username);
    const password = body.password || "";
    if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username) || !password) {
      return Response.json({ error: "Incorrect username or password." }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data: profile } = await admin.from("profiles").select("login_email,active,must_change_password").eq("username", username).maybeSingle();
    if (!profile?.active) return Response.json({ error: "Incorrect username or password." }, { status: 401 });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email: profile.login_email, password });
    if (error) return Response.json({ error: "Incorrect username or password." }, { status: 401 });
    return Response.json({ ok: true, redirectTo: profile.must_change_password ? "/tutor/change-password" : "/tutor" });
  } catch {
    return Response.json({ error: "Login is temporarily unavailable." }, { status: 500 });
  }
}
