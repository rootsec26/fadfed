import type { ReactNode } from "react";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { DashboardShell } from "@/components/dashboard/shell";
import { requirePatient, requireUser } from "@/lib/auth";

export const metadata = { title: "حسابي", robots: { index: false } };

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const patient = await requirePatient(); // redirects doctors to /admin
  const [{ n }] = await db
    .select({ n: count() })
    .from(messages)
    .where(and(eq(messages.patientId, patient.id), eq(messages.sender, "doctor"), isNull(messages.readAt)));

  return (
    <DashboardShell
      title="حسابي"
      userName={user.name}
      showEmergency
      items={[
        { href: "/account", label: "الرئيسية", exact: true },
        { href: "/account/intake", label: "استمارة أول تقييم" },
        { href: "/account/assessments", label: "الاختبارات الذاتية" },
        { href: "/account/messages", label: "الرسائل", badge: n },
        { href: "/account/sessions", label: "الجلسات المباشرة", labelEn: "Live sessions" },
        { href: "/account/profile", label: "ملفي الشخصي" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
