import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { password } = await request.json() as { password?: string };
    if (!password || password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return Response.json({ error: "Use 10+ characters with uppercase, lowercase, a number, and a symbol." }, { status: 400 });
    }
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Your session expired. Sign in again." }, { status: 401 });
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    await createSupabaseAdminClient().from("profiles").update({ must_change_password: false, updated_at: new Date().toISOString() }).eq("id", user.id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "We could not update your password." }, { status: 500 });
  }
}
