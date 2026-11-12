import { redirect } from "next/navigation";

/** Live sessions moved into the Patients page tab — keep old links working. */
export default function AdminLiveSessionsRedirect() {
  redirect("/dashboard/patients?tab=sessions");
}
