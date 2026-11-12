import { redirect } from "next/navigation";
import { AuthForm } from "@/components/site/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";

export const metadata = { title: "دخول | Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const [{ t }, user, sp] = await Promise.all([getI18n(), getCurrentUser(), searchParams]);
  if (user) redirect(user.role === "doctor" ? "/dashboard" : "/account");
  return (
    <section className="px-5 py-14">
      <AuthForm mode="login" t={t.auth} next={sp.next} urlError={sp.error} />
    </section>
  );
}
