import { redirect } from "next/navigation";
import { AuthForm } from "@/components/site/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";

export const metadata = { title: "اعمل حساب | Sign up" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ t }, user, sp] = await Promise.all([getI18n(), getCurrentUser(), searchParams]);
  if (user) redirect(user.role === "doctor" ? "/dashboard" : "/account");
  return (
    <section className="px-5 py-14">
      <AuthForm mode="signup" t={t.auth} next={sp.next} />
    </section>
  );
}
