import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients, services } from "@/db/schema";
import { sendEmail, sendWhatsApp } from "@/lib/integrations/notify";
import { pick, type Lang } from "@/lib/i18n";
import { getSettings, type ClinicSettings } from "@/lib/settings";
import { doctorProfile } from "@/lib/profile";
import { formatDate, formatTime, minutesUntil } from "@/lib/time";
import { getSiteUrl } from "@/lib/site";

export type AppointmentFull = NonNullable<Awaited<ReturnType<typeof loadAppointment>>>;

/** One appointment joined with its patient and service. Pass either column to match on. */
export async function loadAppointment(by: { token: string } | { id: string }) {
  const [row] = await db
    .select({ appointment: appointments, patient: patients, service: services })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .where("token" in by ? eq(appointments.manageToken, by.token) : eq(appointments.id, by.id))
    .limit(1);
  return row ?? null;
}

/** Patients may only cancel/reschedule outside the cancellation window (doctor ignores this). */
export function canPatientModify(a: { status: string; date: string; startTime: string }, s: ClinicSettings) {
  if (a.status !== "pending" && a.status !== "confirmed") return false;
  return minutesUntil(a.date, a.startTime, s.timezone) >= s.cancelWindowHours * 60;
}

export async function getOrigin() {
  const siteUrl = getSiteUrl();
  if (siteUrl) return siteUrl;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${h.get("x-forwarded-proto") ?? "http"}://${host}`;
}

type Kind = "created" | "confirmed" | "cancelled" | "rescheduled";

const copy: Record<Lang, Record<Kind, string>> = {
  ar: {
    created: "تم استلام حجزك",
    confirmed: "تم تأكيد حجزك",
    cancelled: "تم إلغاء حجزك",
    rescheduled: "تم تغيير موعد حجزك",
  },
  en: {
    created: "Your booking was received",
    confirmed: "Your booking is confirmed",
    cancelled: "Your booking was cancelled",
    rescheduled: "Your booking was rescheduled",
  },
};

/** Sends (mock) email + WhatsApp to the patient, and an email to the doctor. */
export async function notifyAppointment(full: AppointmentFull, kind: Kind, lang: Lang = "ar") {
  const s = await getSettings();
  const { appointment: a, patient, service } = full;
  const origin = await getOrigin();
  const link = `${origin}/appointments/${a.manageToken}`;
  const title = pick(lang, service.titleAr, service.titleEn);
  const where =
    a.sessionType === "online"
      ? `${lang === "ar" ? "رابط الجلسة" : "Session link"}: ${a.meetingUrl ?? "-"}`
      : `${lang === "ar" ? "العنوان" : "Address"}: ${lang === "ar" ? doctorProfile.addressAr : doctorProfile.addressEn}`;
  const body = [
    `${copy[lang][kind]} — ${pick(lang, doctorProfile.clinicNameAr, doctorProfile.clinicNameEn)}`,
    `${title}`,
    `${formatDate(a.date, lang)} – ${formatTime(a.startTime, lang)}`,
    where,
    `${lang === "ar" ? "إدارة الحجز" : "Manage booking"}: ${link}`,
  ].join("\n");

  if (s.notifyEmail) await sendEmail(patient.email, copy[lang][kind], body);
  if (s.notifyWhatsapp && patient.phone) await sendWhatsApp(patient.phone, body);
  if (s.notifyDoctor && (kind === "created" || kind === "cancelled" || kind === "rescheduled")) {
    await sendEmail(doctorProfile.email || s.email, `[${kind}] ${patient.fullName}`, body);
  }
}
