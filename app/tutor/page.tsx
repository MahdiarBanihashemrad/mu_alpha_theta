import { requireTutorProfile } from "@/lib/auth";
import TutorDashboard from "./tutor-dashboard";

export const dynamic = "force-dynamic";

export default async function TutorPage() {
  const profile = await requireTutorProfile();
  return <TutorDashboard profile={profile} />;
}
