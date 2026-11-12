"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  appointments,
  articles,
  availabilityRules,
  clinicSettings,
  contactMessages,
  daysOff,
  messages,
  services,
  sessionNotes,
  testimonials,
  type AppointmentStatus,
} from "@/db/schema";
import { loadAppointment, notifyAppointment } from "@/lib/appointments";
import { requireDoctor } from "@/lib/auth";
import { sendEmail } from "@/lib/integrations/notify";
import { loadPatientEmailTarget } from "@/lib/patients";
import { isSlotAvailable } from "@/lib/slots";
import { fromMin, isValidDate, isValidTime, toMin } from "@/lib/time";

/**
 * Doctor-only server actions. EVERY action starts with requireDoctor(),
 * so a patient who forges a request can never change clinic data.
 */

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const optional = (fd: FormData, k: string) => str(fd, k) || null;
const bool = (fd: FormData, k: string) => fd.get(k) === "on";
const refresh = (...paths: string[]) => paths.forEach((p) => revalidatePath(p));

/* ───────────── Appointments ───────────── */

const statuses: AppointmentStatus[] = ["pending", "confirmed", "cancelled", "completed", "no_show"];

export async function setAppointmentStatus(id: string, status: AppointmentStatus) {
  await requireDoctor();
  if (!statuses.includes(status)) return;
  await db
    .update(appointments)
    .set({ status, cancelledBy: status === "cancelled" ? "doctor" : null })
    .where(eq(appointments.id, id));
  const full = await loadAppointment({ id });
  if (full && (status === "confirmed" || status === "cancelled")) await notifyAppointment(full, status);
  refresh("/dashboard", "/dashboard/appointments", `/dashboard/appointments/${id}`, "/account");
}

export async function setPaymentStatus(id: string, paymentStatus: "paid" | "unpaid") {
  await requireDoctor();
  await db.update(appointments).set({ paymentStatus }).where(eq(appointments.id, id));
  refresh(`/dashboard/appointments/${id}`);
}

export async function rescheduleByDoctor(id: string, date: string, time: string): Promise<{ ok: boolean; error?: string }> {
  await requireDoctor();
  if (!isValidDate(date) || !isValidTime(time)) return { ok: false, error: "تاريخ أو وقت مش صح" };
  const full = await loadAppointment({ id });
  if (!full) return { ok: false, error: "الحجز مش موجود" };
  const a = full.appointment;
  if (!(await isSlotAvailable(date, time, a.durationMin, id))) return { ok: false, error: "الموعد ده مش فاضي" };
  try {
    await db
      .update(appointments)
      .set({ date, startTime: time, endTime: fromMin(toMin(time) + a.durationMin) })
      .where(eq(appointments.id, id));
  } catch {
    return { ok: false, error: "الموعد ده مش فاضي" };
  }
  const updated = await loadAppointment({ id });
  if (updated) await notifyAppointment(updated, "rescheduled");
  refresh("/dashboard", "/dashboard/appointments", `/dashboard/appointments/${id}`, "/account");
  return { ok: true };
}

/* ───────────── Availability ───────────── */

const ruleSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: z.string().refine(isValidTime),
  endTime: z.string().refine(isValidTime),
  breakStart: z.string().refine(isValidTime).optional().or(z.literal("")),
  breakEnd: z.string().refine(isValidTime).optional().or(z.literal("")),
});

export async function addAvailabilityRule(fd: FormData) {
  await requireDoctor();
  const p = ruleSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return;
  const d = p.data;
  if (toMin(d.endTime) <= toMin(d.startTime)) return;
  const hasBreak = d.breakStart && d.breakEnd && toMin(d.breakEnd) > toMin(d.breakStart);
  await db.insert(availabilityRules).values({
    weekday: d.weekday,
    startTime: d.startTime,
    endTime: d.endTime,
    breakStart: hasBreak ? d.breakStart : null,
    breakEnd: hasBreak ? d.breakEnd : null,
  });
  refresh("/dashboard/calendar", "/contact");
}

export async function toggleAvailabilityRule(id: number, active: boolean) {
  await requireDoctor();
  await db.update(availabilityRules).set({ active }).where(eq(availabilityRules.id, id));
  refresh("/dashboard/calendar", "/contact");
}

export async function deleteAvailabilityRule(id: number) {
  await requireDoctor();
  await db.delete(availabilityRules).where(eq(availabilityRules.id, id));
  refresh("/dashboard/calendar", "/contact");
}

export async function addDayOff(fd: FormData) {
  await requireDoctor();
  const date = str(fd, "date");
  if (!isValidDate(date)) return;
  await db.insert(daysOff).values({ date, reason: optional(fd, "reason") }).onConflictDoNothing();
  refresh("/dashboard/calendar");
}

export async function deleteDayOff(id: number) {
  await requireDoctor();
  await db.delete(daysOff).where(eq(daysOff.id, id));
  refresh("/dashboard/calendar");
}

/* ───────────── Patients: private notes & messages ───────────── */

export async function addSessionNote(patientId: string, appointmentId: string | null, fd: FormData) {
  await requireDoctor();
  const content = str(fd, "content");
  if (content.length < 2) return;
  await db.insert(sessionNotes).values({ patientId, appointmentId, content });
  refresh(`/dashboard/patients/${patientId}`, appointmentId ? `/dashboard/appointments/${appointmentId}` : "/dashboard");
}

export async function deleteSessionNote(id: number, patientId: string) {
  await requireDoctor();
  await db.delete(sessionNotes).where(eq(sessionNotes.id, id));
  refresh(`/dashboard/patients/${patientId}`);
}

export async function replyToPatient(patientId: string, fd: FormData) {
  await requireDoctor();
  const body = str(fd, "body").slice(0, 3000);
  if (body.length < 2) return;
  await db.insert(messages).values({ patientId, sender: "doctor", body });
  const target = await loadPatientEmailTarget(patientId);
  if (target) await sendEmail(target.email, "رسالة جديدة من الدكتور", "عندك رسالة جديدة في حسابك على الموقع.");
  refresh(`/dashboard/patients/${patientId}`, "/dashboard/messages", "/account/messages");
}

export async function setContactHandled(id: number, handled: boolean) {
  await requireDoctor();
  await db.update(contactMessages).set({ handled }).where(eq(contactMessages.id, id));
  refresh("/dashboard/messages");
}

/* ───────────── Content: services / articles / testimonials ───────────── */

const serviceSchema = z.object({
  slug: z.string().trim().min(2).max(60),
  titleAr: z.string().trim().min(2),
  titleEn: z.string().trim().optional(),
  descriptionAr: z.string().trim().min(2),
  descriptionEn: z.string().trim().optional(),
  price: z.coerce.number().int().min(0),
  durationMin: z.coerce.number().int().min(10).max(240),
  mode: z.enum(["online", "clinic", "both"]),
  icon: z.string().trim().min(1),
  sortOrder: z.coerce.number().int().default(0),
});

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");

export async function saveService(fd: FormData) {
  await requireDoctor();
  const p = serviceSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return;
  const values = {
    ...p.data,
    slug: slugify(p.data.slug),
    titleEn: p.data.titleEn || null,
    descriptionEn: p.data.descriptionEn || null,
    active: bool(fd, "active"),
  };
  const id = Number(fd.get("id"));
  if (id) await db.update(services).set(values).where(eq(services.id, id));
  else await db.insert(services).values(values).onConflictDoNothing();
  refresh("/dashboard/services", "/services", "/book", "/home");
}

const articleSchema = z.object({
  slug: z.string().trim().min(2).max(120),
  titleAr: z.string().trim().min(2),
  titleEn: z.string().trim().optional(),
  excerptAr: z.string().trim().min(2),
  excerptEn: z.string().trim().optional(),
  contentAr: z.string().trim().min(2),
  contentEn: z.string().trim().optional(),
  category: z.string().trim().min(1),
});

export async function saveArticle(fd: FormData) {
  await requireDoctor();
  const p = articleSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return;
  const values = {
    ...p.data,
    slug: slugify(p.data.slug),
    titleEn: p.data.titleEn || null,
    excerptEn: p.data.excerptEn || null,
    contentEn: p.data.contentEn || null,
    published: bool(fd, "published"),
  };
  const id = Number(fd.get("id"));
  if (id) await db.update(articles).set(values).where(eq(articles.id, id));
  else await db.insert(articles).values(values).onConflictDoNothing();
  refresh("/dashboard/articles", "/blog");
}

export async function deleteArticle(id: number) {
  await requireDoctor();
  await db.delete(articles).where(eq(articles.id, id));
  refresh("/dashboard/articles", "/blog");
}

const testimonialSchema = z.object({
  nameAr: z.string().trim().min(1),
  nameEn: z.string().trim().optional(),
  textAr: z.string().trim().min(2),
  textEn: z.string().trim().optional(),
  rating: z.coerce.number().int().min(1).max(5),
});

export async function saveTestimonial(fd: FormData) {
  await requireDoctor();
  const p = testimonialSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return;
  const values = { ...p.data, nameEn: p.data.nameEn || null, textEn: p.data.textEn || null, published: bool(fd, "published") };
  const id = Number(fd.get("id"));
  if (id) await db.update(testimonials).set(values).where(eq(testimonials.id, id));
  else await db.insert(testimonials).values(values);
  refresh("/dashboard/testimonials", "/home");
}

export async function deleteTestimonial(id: number) {
  await requireDoctor();
  await db.delete(testimonials).where(eq(testimonials.id, id));
  refresh("/dashboard/testimonials", "/home");
}

/* ───────────── Settings ───────────── */

const settingsSchema = z.object({
  currencyAr: z.string().trim().min(1),
  currencyEn: z.string().trim().min(1),
  timezone: z.string().trim().min(3),
  slotStepMin: z.coerce.number().int().min(5).max(120),
  minNoticeHours: z.coerce.number().int().min(0).max(168),
  cancelWindowHours: z.coerce.number().int().min(0).max(168),
});

export async function saveSettings(fd: FormData) {
  await requireDoctor();
  const p = settingsSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) redirect("/dashboard/settings?error=1");
  try {
    new Intl.DateTimeFormat("en", { timeZone: p.data.timezone });
  } catch {
    redirect("/dashboard/settings?error=tz");
  }
  await db
    .update(clinicSettings)
    .set({
      ...p.data,
      notifyEmail: bool(fd, "notifyEmail"),
      notifyWhatsapp: bool(fd, "notifyWhatsapp"),
      notifyDoctor: bool(fd, "notifyDoctor"),
    })
    .where(eq(clinicSettings.id, 1));
  revalidatePath("/home", "layout");
  redirect("/dashboard/settings?saved=1");
}
