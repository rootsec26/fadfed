"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assessments, intakeForms, messages, patients, users } from "@/db/schema";
import { requirePatient, requireUser } from "@/lib/auth";
import { ASSESSMENTS, isAssessmentType, scoreAssessment } from "@/lib/assessments";
import { sendEmail } from "@/lib/integrations/notify";
import { getSettings } from "@/lib/settings";
import { doctorProfile } from "@/lib/profile";

/* All actions here operate ONLY on the logged-in patient's own record. */

const intakeSchema = z.object({
  reason: z.string().trim().min(5).max(3000),
  history: z.string().trim().max(3000).optional(),
  previousTherapy: z.string().trim().max(2000).optional(),
  medications: z.string().trim().max(2000).optional(),
});

export async function saveIntake(formData: FormData) {
  const patient = await requirePatient();
  if (formData.get("consent") !== "on") redirect("/account/intake?error=consent");
  const parsed = intakeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/account/intake?error=invalid");

  const values = {
    ...parsed.data,
    history: parsed.data.history || null,
    previousTherapy: parsed.data.previousTherapy || null,
    medications: parsed.data.medications || null,
    consentAt: new Date(),
    updatedAt: new Date(),
  };
  await db
    .insert(intakeForms)
    .values({ patientId: patient.id, ...values })
    .onConflictDoUpdate({ target: intakeForms.patientId, set: values });
  revalidatePath("/account");
  redirect("/account/intake?saved=1");
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(),
  birthDate: z.string().trim().max(10).optional(),
  gender: z.string().trim().max(20).optional(),
  emergencyContact: z.string().trim().max(200).optional(),
});

export async function saveProfile(formData: FormData) {
  const user = await requireUser();
  const patient = await requirePatient();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/account/profile?error=1");
  const d = parsed.data;
  await db
    .update(patients)
    .set({
      fullName: d.fullName,
      phone: d.phone || null,
      birthDate: d.birthDate || null,
      gender: d.gender || null,
      emergencyContact: d.emergencyContact || null,
    })
    .where(eq(patients.id, patient.id));
  await db.update(users).set({ name: d.fullName, phone: d.phone || null }).where(eq(users.id, user.id));
  revalidatePath("/account", "layout");
  redirect("/account/profile?saved=1");
}

export async function submitAssessment(type: string, formData: FormData) {
  const patient = await requirePatient();
  if (!isAssessmentType(type)) redirect("/account/assessments");
  const count = ASSESSMENTS[type].questions.length;
  const answers = Array.from({ length: count }, (_, i) => Number(formData.get(`q${i}`)));
  if (answers.some((a) => !Number.isInteger(a) || a < 0 || a > 3)) redirect(`/account/assessments/${type}?error=1`);

  const { score, severity } = scoreAssessment(type, answers);
  const [row] = await db
    .insert(assessments)
    .values({ patientId: patient.id, type, answers, score, severity })
    .returning({ id: assessments.id });
  revalidatePath("/account/assessments");
  redirect(`/account/assessments?done=${row.id}`);
}

export async function sendPatientMessage(formData: FormData) {
  const patient = await requirePatient();
  const body = String(formData.get("body") ?? "").trim().slice(0, 3000);
  if (body.length < 2) return;
  await db.insert(messages).values({ patientId: patient.id, sender: "patient", body });
  const s = await getSettings();
  if (s.notifyDoctor) await sendEmail(doctorProfile.email || s.email, `رسالة جديدة من ${patient.fullName}`, "عندك رسالة جديدة في لوحة التحكم.");
  revalidatePath("/account/messages");
  revalidatePath("/dashboard", "layout");
}
