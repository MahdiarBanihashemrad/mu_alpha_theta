import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TutorRole = "tutor" | "officer" | "admin";

export type TutorProfile = {
  id: string;
  s_number: string;
  full_name: string;
  school_email: string;
  role: TutorRole;
  subjects: string[];
  active: boolean;
  must_change_password: boolean;
};

export async function getCurrentProfile(): Promise<TutorProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("id,s_number,full_name,school_email,role,subjects,active,must_change_password").eq("id", user.id).maybeSingle();
  return data as TutorProfile | null;
}

export async function requireTutorProfile() {
  const profile = await getCurrentProfile();
  if (!profile || !profile.active) redirect("/tutor/login");
  if (profile.must_change_password) redirect("/tutor/change-password");
  return profile;
}
