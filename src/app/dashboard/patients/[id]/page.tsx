import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { Lock, Trash2 } from "lucide-react";
import { db } from "@/db";
import { appointments, assessments, intakeForms, messages, patients, services, sessionNotes } from "@/db/schema";
import { addSessionNote, deleteSessionNote, replyToPatient } from "@/actions/admin";
import { ActionForm } from "@/components/dashboard/action-form";
import { PageTitle } from "@/components/dashboard/shell";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Badge, Card, Textarea, btn, cn, statusTone } from "@/components/ui";
import { requireDoctor } from "@/lib/auth";
import { ASSESSMENTS, maxScore } from "@/lib/assessments";
import { formatDate, formatTime } from "@/lib/time";

const STATUS_AR = { pending: "مستني التأكيد", confirmed: "متأكد", cancelled: "ملغي", completed: "خلص", no_show: "مارضاش" } as const;
const fmt = (d: Date) => d.toLocaleString("ar-u-nu-latn", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" });

export default async function AdminPatientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireDoctor();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [patient] = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  if (!patient) notFound();

  const [[intake], sessions, notes, tests, thread] = await Promise.all([
    db.select().from(intakeForms).where(eq(intakeForms.patientId, id)).limit(1),
    db
      .select({ a: appointments, s: services })
      .from(appointments)
      .innerJoin(services, eq(services.id, appointments.serviceId))
      .where(eq(appointments.patientId, id))
      .orderBy(desc(appointments.date), desc(appointments.startTime)),
    db.select().from(sessionNotes).where(eq(sessionNotes.patientId, id)).orderBy(desc(sessionNotes.createdAt)),
    db.select().from(assessments).where(eq(assessments.patientId, id)).orderBy(desc(assessments.createdAt)),
    db.select().from(messages).where(eq(messages.patientId, id)).orderBy(asc(messages.createdAt)),
  ]);
  // opening the thread marks the patient's messages as read
  await db.update(messages).set({ readAt: new Date() }).where(and(eq(messages.patientId, id), eq(messages.sender, "patient"), isNull(messages.readAt)));

  return (
    <>
      <PageTitle title={patient.fullName} subtitle={`${patient.email} · ${patient.phone ?? ""}`} action={<Link href="/dashboard/patients" className={btn("ghost", "sm")}>← المرضى</Link>} />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Card className="space-y-2 text-sm">
            <h2 className="mb-2 font-bold text-brand-900">الملف الشخصي</h2>
            {[
              ["تاريخ الميلاد", patient.birthDate],
              ["الجنس", patient.gender === "female" ? "أنثى" : patient.gender === "male" ? "ذكر" : null],
              ["حد للطوارئ", patient.emergencyContact],
              ["الحساب", patient.userId ? "مسجل" : "ضيف (بدون حساب)"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-t border-sand-100 pt-2"><span className="text-ink-soft">{k}</span><span className="font-semibold">{v || "—"}</span></div>
            ))}
          </Card>

          <Card className="space-y-3 text-sm">
            <h2 className="font-bold text-brand-900">استمارة أول تقييم</h2>
            {!intake ? <p className="text-ink-soft">لسه مكملهاش.</p> : (
              <>
                {[["سبب الزيارة", intake.reason], ["التاريخ الصحي", intake.history], ["علاج قبل كده", intake.previousTherapy], ["الأدوية الحالية", intake.medications]].map(([k, v]) => (
                  <div key={k}><p className="text-xs font-semibold text-ink-soft">{k}</p><p className="mt-0.5 whitespace-pre-wrap leading-7">{v || "—"}</p></div>
                ))}
                <p className="text-xs text-sage-700">وافق على المعالجة: {fmt(intake.consentAt)}</p>
              </>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-bold text-brand-900">الاختبارات الذاتية</h2>
            {tests.length === 0 ? <p className="text-sm text-ink-soft">مفيش نتايج.</p> : (
              <ul className="space-y-2 text-sm">
                {tests.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-sand-50 px-4 py-2.5">
                    <span>{ASSESSMENTS[t.type].short} · {fmt(t.createdAt)}</span>
                    <span className="flex items-center gap-2"><Badge tone="blue">{t.score}/{maxScore(t.type)}</Badge>{t.severity}{t.type === "phq9" && t.answers[8] > 0 && <Badge tone="red">سؤال الأمان</Badge>}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-bold text-brand-900">سجل الجلسات</h2>
            <ul className="space-y-2 text-sm">
              {sessions.length === 0 && <li className="text-ink-soft">مفيش جلسات.</li>}
              {sessions.map(({ a, s }) => (
                <li key={a.id}>
                  <Link href={`/dashboard/appointments/${a.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-sand-50 px-4 py-2.5 hover:bg-sand-100">
                    <span>{formatDate(a.date, "ar", { day: "numeric", month: "short", year: "numeric" })} · {formatTime(a.startTime, "ar")} · {s.titleAr}</span>
                    <Badge tone={statusTone(a.status)}>{STATUS_AR[a.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-3 border-amber-200 bg-amber-50/40">
            <h2 className="flex items-center gap-2 font-bold text-brand-900"><Lock className="size-4 text-amber-600" /> ملاحظات خاصة (للدكتور بس)</h2>
            <p className="text-xs text-ink-soft">الملاحظات دي مش بتظهر للمريض ولا لأي حساب تاني.</p>
            <ActionForm action={addSessionNote.bind(null, id, null)} className="space-y-3">
              <Textarea name="content" required placeholder="ملاحظة جديدة..." />
              <SubmitButton size="sm">احفظ الملاحظة</SubmitButton>
            </ActionForm>
            {notes.map((n) => (
              <div key={n.id} className="rounded-2xl bg-white p-4 text-sm">
                <p className="whitespace-pre-wrap leading-7">{n.content}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-ink-soft">
                  <span>{fmt(n.createdAt)}</span>
                  <form action={deleteSessionNote.bind(null, n.id, id)}><button aria-label="مسح" className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-rose-600 transition hover:bg-rose-50 lg:size-8"><Trash2 className="size-4" /></button></form>
                </div>
              </div>
            ))}
          </Card>

          <Card id="messages" className="space-y-3">
            <h2 className="font-bold text-brand-900">الرسائل</h2>
            {!patient.userId && <Alert>المريض ده ضيف ومعندوش حساب، مش هيشوف الرد جوه الموقع (هيوصله إشعار على الإيميل بس).</Alert>}
            <div className="space-y-2">
              {thread.length === 0 && <p className="text-sm text-ink-soft">مفيش رسايل.</p>}
              {thread.map((m) => (
                <div key={m.id} className={cn("max-w-[88%] rounded-3xl px-4 py-2.5 text-sm leading-7", m.sender === "doctor" ? "me-auto bg-brand-600 text-white" : "ms-auto bg-sand-100")}>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className={cn("text-[11px]", m.sender === "doctor" ? "text-brand-100" : "text-ink-soft")}>{fmt(m.createdAt)}</p>
                </div>
              ))}
            </div>
            <ActionForm action={replyToPatient.bind(null, id)} className="space-y-3 border-t border-sand-100 pt-3">
              <Textarea name="body" required placeholder="اكتب ردك..." className="min-h-20" />
              <SubmitButton size="sm">ابعت الرد</SubmitButton>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
