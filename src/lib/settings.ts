import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clinicSettings } from "@/db/schema";
import { ensureSeed } from "@/db/seed";
import { doctorProfile } from "@/lib/profile";

/**
 * Fallback row used when clinic_settings is empty (fresh DB, failed seed,
 * AUTO_SEED=false, etc.). Mirrors the schema defaults; currency is EGP
 * because the clinic is Egyptian.
 */
export const DEFAULT_SETTINGS = {
  id: 1,
  doctorNameAr: doctorProfile.nameAr,
  doctorNameEn: doctorProfile.nameEn,
  titleAr: doctorProfile.titleAr,
  titleEn: doctorProfile.titleEn,
  clinicNameAr: doctorProfile.clinicNameAr,
  clinicNameEn: doctorProfile.clinicNameEn,
  addressAr: doctorProfile.addressAr,
  addressEn: doctorProfile.addressEn,
  phone: doctorProfile.phone,
  whatsapp: doctorProfile.whatsapp,
  email: doctorProfile.email,
  instagram: doctorProfile.instagram || null,
  twitter: doctorProfile.twitter || null,
  facebook: doctorProfile.facebook || null,
  tiktok: doctorProfile.tiktok || null,
  hotline: doctorProfile.hotline,
  currencyAr: "ج.م",
  currencyEn: "EGP",
  timezone: "Asia/Riyadh",
  slotStepMin: 30,
  minNoticeHours: 4,
  cancelWindowHours: 24,
  notifyEmail: true,
  notifyWhatsapp: true,
  notifyDoctor: true,
} as const;

/**
 * Single-row clinic settings (id = 1). Also triggers first-run demo seeding.
 * Never returns null/undefined: if the row is missing it is created from
 * DEFAULT_SETTINGS, and DEFAULT_SETTINGS itself is the last-resort fallback.
 */
export const getSettings = cache(async () => {
  try {
    await ensureSeed();
    const [row] = await db.select().from(clinicSettings).where(eq(clinicSettings.id, 1)).limit(1);
    if (row) return row;

    // Self-heal: create the singleton row so the app works even when the
    // demo seed never ran (AUTO_SEED=false or a partial/failed seed).
    await db
      .insert(clinicSettings)
      .values({ ...DEFAULT_SETTINGS })
      .onConflictDoNothing({ target: clinicSettings.id });
    const [created] = await db.select().from(clinicSettings).where(eq(clinicSettings.id, 1)).limit(1);
    return created ?? { ...DEFAULT_SETTINGS };
  } catch (err) {
    // Public pages render with defaults when the DB is unreachable instead
    // of crashing; protected pages still fail at their own queries.
    console.error("[settings] getSettings failed:", err);
    return { ...DEFAULT_SETTINGS };
  }
});

export type ClinicSettings = NonNullable<Awaited<ReturnType<typeof getSettings>>>;
