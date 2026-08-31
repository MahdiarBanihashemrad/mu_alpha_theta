import { redirect } from "next/navigation";

import { requireTutorProfile } from "@/lib/auth";
import ManageTutors from "./manage-tutors";

export const dynamic = "force-dynamic";

export default async function ManageTutorsPage() {
  const profile = await requireTutorProfile();
  if (profile.role !== "admin") redirect("/tutor");
  return <ManageTutors />;
}
