"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { appointments, patients, services } from "@/db/schema";
import { canPatientModify, loadAppointment, notifyAppointment } from "@/lib/appointments";
import { getCurrentUser, getOrCreatePatientForUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";
import { createMeetingLink } from "@/lib/integrations/video";
import { createPaymentSession } from "@/lib/integrations/payments";
import { getSettings } from "@/lib/settings";
import { isSlotAvailable } from "@/lib/slots";
import { fromMin, isValidDate, isValidTime, toMin } from "@/lib/time";

export type BookingResult = { ok: true; token: string } | { ok: false; error: string };

const bookingSchema = z.object({
  serviceId: z.number().int().positive(),
  date: z.string().refine(isValidDate),
  time: z.string().refine(isValidTime),
  sessionType: z.enum(["online", "clinic"]),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(6).max(30),
  note: z.string().trim().max(1000).optional(),
  consent: z.literal(true),
});

export type BookingInput = z.input<typeof bookingSchema>;

const isUniqueViolation = (e: unknown) =>
  typeof e === "object" && e !== null && ("code" in e ? (e as { code?: string }).code === "23505" : false);

export async function createBooking(input: BookingInput): Promise<BookingResult> {
  const { t, lang } = await getI18n();
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    const consent = parsed.error.issues.some((i) => i.path[0] === "consent");
    return { ok: false, error: consent ? t.booking.errors.consent : t.booking.errors.invalid };
  }
  const d = parsed.data;

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, d.serviceId), eq(services.active, true)))
    .limit(1);
  if (!service) return { ok: false, error: t.booking.errors.invalid };
  if (service.mode !== "both" && service.mode !== d.sessionType) {
    return { ok: false, error: t.booking.errors.invalid };
  }
  if (!(await isSlotAvailable(d.date, d.time, service.durationMin))) {
    return { ok: false, error: t.booking.errors.unavailable };
  }

  // Resolve the patient record: logged-in patient, or a guest record by email.
  const user = await getCurrentUser();
  let patientId: string;
  if (user && user.role === "patient") {
    patientId = (await getOrCreatePatientForUser(user)).id;
  } else {
    const all = await db.select().from(patients).where(eq(patients.email, d.email));
    const guest = all.find((p) => p.userId === null);
    if (guest) {
      patientId = guest.id;
      await db.update(patients).set({ fullName: d.name, phone: d.phone }).where(eq(patients.id, guest.id));
    } else {
      const [created] = await db
        .insert(patients)
        .values({ fullName: d.name, email: d.email, phone: d.phone })
        .returning();
      patientId = created.id;
    }
  }

  const token = randomBytes(24).toString("hex");
  try {
    const [row] = await db
      .insert(appointments)
      .values({
        manageToken: token,
        patientId,
        serviceId: service.id,
        date: d.date,
        startTime: d.time,
        endTime: fromMin(toMin(d.time) + service.durationMin),
        durationMin: service.durationMin,
        sessionType: d.sessionType,
        meetingUrl: d.sessionType === "online" ? await createMeetingLink() : null,
        patientNote: d.note || null,
        price: service.price,
      })
      .returning({ id: appointments.id });

    await createPaymentSession(row.id, service.price); // mock – no charge
    const full = await loadAppointment({ id: row.id });
    if (full) await notifyAppointment(full, "created", lang);
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: t.booking.errors.unavailable };
    throw e;
  }

  revalidatePath("/account");
  revalidatePath("/dashboard");
  return { ok: true, token };
}

/** Patient-side cancel (authorised by the unguessable manage token). */
export async function cancelAppointment(token: string) {
  const { lang } = await getI18n();
  const [settings, full] = await Promise.all([getSettings(), loadAppointment({ token })]);
  if (!full || !canPatientModify(full.appointment, settings)) return;

  await db
    .update(appointments)
    .set({ status: "cancelled", cancelledBy: "patient" })
    .where(eq(appointments.id, full.appointment.id));
  await notifyAppointment({ ...full, appointment: { ...full.appointment, status: "cancelled" } }, "cancelled", lang);
  revalidatePath(`/appointments/${token}`);
  revalidatePath("/account");
  revalidatePath("/dashboard", "layout");
}

export async function rescheduleAppointment(token: string, date: string, time: string): Promise<BookingResult> {
  const { t, lang } = await getI18n();
  const [settings, full] = await Promise.all([getSettings(), loadAppointment({ token })]);
  if (!full || !canPatientModify(full.appointment, settings)) return { ok: false, error: t.booking.errors.invalid };
  if (!isValidDate(date) || !isValidTime(time)) return { ok: false, error: t.booking.errors.invalid };

  const a = full.appointment;
  if (!(await isSlotAvailable(date, time, a.durationMin, a.id))) {
    return { ok: false, error: t.booking.errors.unavailable };
  }
  try {
    await db
      .update(appointments)
      .set({ date, startTime: time, endTime: fromMin(toMin(time) + a.durationMin) })
      .where(eq(appointments.id, a.id));
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: t.booking.errors.unavailable };
    throw e;
  }
  const updated = await loadAppointment({ token });
  if (updated) await notifyAppointment(updated, "rescheduled", lang);
  revalidatePath(`/appointments/${token}`);
  revalidatePath("/account");
  revalidatePath("/dashboard", "layout");
  return { ok: true, token };
}
