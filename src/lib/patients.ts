import { eq } from "drizzle-orm";
import { db } from "@/db";
import { patients } from "@/db/schema";

export async function loadPatientEmailTarget(patientId: string) {
  const [p] = await db
    .select({ email: patients.email, phone: patients.phone })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);
  return p ?? null;
}
