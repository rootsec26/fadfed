import { redirect } from "next/navigation";
import { getCurrentUser, isAdminEmail } from "@/lib/auth";

/**
 * Root dispatcher: the doctor dashboard IS the home page for the
 * allow-listed admin account; everyone else lands on the public site
 * (/home). Keeps "admin" out of the URL entirely.
 */
export default async function RootPage() {
  const user = await getCurrentUser();
  if (user?.role === "doctor" && isAdminEmail(user.email)) redirect("/dashboard");
  redirect("/home");
}
