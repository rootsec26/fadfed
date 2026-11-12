import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { sendPatientMessage } from "@/actions/patient";
import { PageTitle } from "@/components/dashboard/shell";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, Textarea, cn } from "@/components/ui";
import { requirePatient } from "@/lib/auth";

export default async function PatientMessagesPage() {
  const patient = await requirePatient();
  const thread = await db.select().from(messages).where(eq(messages.patientId, patient.id)).orderBy(asc(messages.createdAt));
  // opening the thread marks the doctor's replies as read
  await db.update(messages).set({ readAt: new Date() }).where(and(eq(messages.patientId, patient.id), eq(messages.sender, "doctor"), isNull(messages.readAt)));

  return (
    <>
      <PageTitle title="الرسايل" subtitle="ابعت رسالة للدكتور. الرسايل بتتقري وبيرد عليها في أيام الشغل." />
      <div className="mb-5 max-w-2xl"><Alert tone="warning">القناة دي مش للطوارئ. لو في خطر قريب كلم خدمات الطوارئ على طول.</Alert></div>
      <Card className="max-w-2xl space-y-4">
        <div className="space-y-3">
          {thread.length === 0 && <p className="py-6 text-center text-sm text-ink-soft">مفيش رسايل لسه.</p>}
          {thread.map((m) => (
            <div key={m.id} className={cn("max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-7", m.sender === "patient" ? "me-auto bg-brand-600 text-white" : "ms-auto bg-sand-100 text-ink")}>
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className={cn("mt-1 text-[11px]", m.sender === "patient" ? "text-brand-100" : "text-ink-soft")}>
                {m.sender === "doctor" ? "الدكتور · " : ""}{m.createdAt.toLocaleString("ar-u-nu-latn", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" })}
              </p>
            </div>
          ))}
        </div>
        <form action={sendPatientMessage} className="space-y-3 border-t border-sand-100 pt-4">
          <Textarea name="body" required minLength={2} placeholder="اكتب رسايلك..." className="min-h-24" />
          <SubmitButton pendingText="بتتبعت...">ابعت</SubmitButton>
        </form>
      </Card>
    </>
  );
}
