import type { ReactNode } from "react";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { appointments, contactMessages, messages } from "@/db/schema";
import { DashboardShell } from "@/components/dashboard/shell";
import { requireDoctor } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";

export const metadata = { title: "لوحة الدكتور", robots: { index: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [user, { lang }] = await Promise.all([requireDoctor(), getI18n()]);
  const [[pending], [unread], [contact]] = await Promise.all([
    db.select({ n: count() }).from(appointments).where(eq(appointments.status, "pending")),
    db.select({ n: count() }).from(messages).where(and(eq(messages.sender, "patient"), isNull(messages.readAt))),
    db.select({ n: count() }).from(contactMessages).where(eq(contactMessages.handled, false)),
  ]);

  return (
    <DashboardShell
      title="لوحة الدكتور"
      titleEn="Doctor dashboard"
      lang={lang}
      userName={user.name}
      items={[
        { href: "/dashboard", label: "نظرة عامة", labelEn: "Overview", exact: true },
        { href: "/dashboard/appointments", label: "المواعيد", labelEn: "Appointments", badge: pending.n },
        { href: "/dashboard/calendar", label: "التقويم والمواعيد", labelEn: "Calendar" },
        { href: "/dashboard/patients", label: "المرضى", labelEn: "Patients" },
        { href: "/dashboard/messages", label: "الرسائل", labelEn: "Messages", badge: unread.n + contact.n },
        { href: "/dashboard/videos", label: "الفيديوهات", labelEn: "Videos" },
        { href: "/dashboard/services", label: "الخدمات والأسعار", labelEn: "Services" },
        { href: "/dashboard/articles", label: "المقالات", labelEn: "Articles" },
        { href: "/dashboard/testimonials", label: "آراء المرضى", labelEn: "Testimonials" },
        { href: "/dashboard/settings", label: "الإعدادات", labelEn: "Settings" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
