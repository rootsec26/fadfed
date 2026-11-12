import { notFound, redirect } from "next/navigation";
import { RescheduleForm } from "@/components/booking/reschedule-form";
import { PageHero } from "@/components/site/page-hero";
import { Card } from "@/components/ui";
import { canPatientModify, loadAppointment } from "@/lib/appointments";
import { getI18n } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";

export const metadata = { robots: { index: false } };

export default async function ReschedulePage({ params }: { params: Promise<{ token: string }> }) {
  const [{ t, lang }, { token }, settings] = await Promise.all([getI18n(), params, getSettings()]);
  const full = await loadAppointment({ token });
  if (!full) notFound();
  if (!canPatientModify(full.appointment, settings)) redirect(`/appointments/${token}`);

  return (
    <>
      <PageHero title={t.booking.rescheduleTitle} />
      <section className="mx-auto max-w-3xl px-5 py-10">
        <Card className="p-5 sm:p-8">
          <RescheduleForm token={token} appointmentId={full.appointment.id} durationMin={full.appointment.durationMin} lang={lang} t={t.booking} />
        </Card>
      </section>
    </>
  );
}
