import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { Video } from "lucide-react";
import { db } from "@/db";
import { sessionNotes } from "@/db/schema";
import { addSessionNote, setPaymentStatus } from "@/actions/admin";
import { AdminReschedule } from "@/components/dashboard/admin-reschedule";
import { PageTitle } from "@/components/dashboard/shell";
import { StatusActions } from "@/components/dashboard/status-actions";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/dashboard/action-form";
import { Alert, Badge, Card, Textarea, btn, statusTone } from "@/components/ui";
import { loadAppointment } from "@/lib/appointments";
import { requireDoctor } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/time";

const STATUS_AR = { pending: "مستني التأكيد", confirmed: "متأكد", cancelled: "ملغي", completed: "خلص", no_show: "مارضاش" } as const;

export default async function AdminAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireDoctor();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const full = await loadAppointment({ id });
  if (!full) notFound();
  const { appointment: a, patient, service } = full;
  const notes = await db.select().from(sessionNotes).where(eq(sessionNotes.appointmentId, id)).orderBy(asc(sessionNotes.createdAt));
  const active = a.status === "pending" || a.status === "confirmed";

  const rows: [string, string][] = [
    ["الخدمة", `${service.titleAr} (${a.durationMin} دقيقة)`],
    ["التاريخ", formatDate(a.date, "ar")],
    ["الوقت", `${formatTime(a.startTime, "ar")} – ${formatTime(a.endTime, "ar")}`],
    ["نوع الجلسة", a.sessionType === "online" ? "أونلاين (فيديو)" : "في العيادة"],
    ["السعر", a.price > 0 ? `${a.price}` : "يتحدد مع الدكتور"],
    ["الدفع", a.paymentStatus === "paid" ? "اتدفع" : "لسه مدفوعش"],
  ];

  return (
    <>
      <PageTitle title="تفاصيل الموعد" subtitle={patient.fullName} action={<Link href="/dashboard/appointments" className={btn("ghost", "sm")}>← كل المواعيد</Link>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <Link href={`/dashboard/patients/${patient.id}`} className="font-bold text-brand-800 hover:underline">{patient.fullName}</Link>
              <Badge tone={statusTone(a.status)}>{STATUS_AR[a.status]}</Badge>
            </div>
            <p className="text-sm text-ink-soft" dir="ltr">{patient.email} · {patient.phone}</p>
            {rows.map(([k, v]) => (
              <div key={k} className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-sand-100 pt-3 text-sm"><span className="text-ink-soft">{k}</span><span className="font-semibold">{v}</span></div>
            ))}
            {a.patientNote && <Alert>{a.patientNote}</Alert>}
            {a.meetingUrl && a.sessionType === "online" && (
              <a href={a.meetingUrl} target="_blank" rel="noreferrer" className={btn("primary", "sm")}><Video className="size-4" /> رابط الجلسة</a>
            )}
            <div className="flex flex-wrap items-center gap-2 border-t border-sand-100 pt-4">
              <StatusActions id={a.id} status={a.status} />
              <form action={setPaymentStatus.bind(null, a.id, a.paymentStatus === "paid" ? "unpaid" : "paid")}>
                <SubmitButton size="sm" variant="secondary">{a.paymentStatus === "paid" ? "خلّيها لسه مدفوعش" : "أكد الدفع"}</SubmitButton>
              </form>
            </div>
          </Card>

          <Card className="space-y-3">
            <h2 className="font-bold text-brand-900">ملاحظات الجلسة (سرية – المريض مش بيشوفها)</h2>
            {notes.map((n) => (
              <p key={n.id} className="whitespace-pre-wrap rounded-2xl bg-sand-100 p-4 text-sm leading-7">{n.content}</p>
            ))}
            <ActionForm action={addSessionNote.bind(null, patient.id, a.id)} className="space-y-3">
              <Textarea name="content" required placeholder="اكتب ملاحظة سريرية..." />
              <SubmitButton size="sm">احفظ الملاحظة</SubmitButton>
            </ActionForm>
          </Card>
        </div>

        <Card>
          <h2 className="mb-4 font-bold text-brand-900">تغيير الموعد</h2>
          {active ? <AdminReschedule id={a.id} durationMin={a.durationMin} /> : <p className="text-sm text-ink-soft">مش تقدر تغير موعد جلسة مش شغالة.</p>}
        </Card>
      </div>
    </>
  );
}
