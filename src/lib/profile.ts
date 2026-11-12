/**
 * Single source of truth for the doctor's public profile and clinic contact info.
 * Edit here — no need to touch the database or translations for these fields.
 * (The clinic_settings row is seeded from these values and remains the store
 * for operational settings like currency, timezone and working hours.)
 */
export const doctorProfile = {
  nameAr: "د. أحمد يوسف",
  nameEn: "Dr. Ahmed Youssef",
  titleAr: "أخصائي نفسي",
  titleEn: "Psychologist",
  photo: "/images/dr_ahmed.jpeg",
  photoAltAr: "صورة د. أحمد يوسف",
  photoAltEn: "Photo of Dr. Ahmed Youssef",

  clinicNameAr: "فضفض",
  clinicNameEn: "Fadfed",

  // TODO: fill in real contact details — leave empty to hide them on the site.
  phone: "",
  whatsapp: "201111648119", // digits only, with country code, e.g. "9665XXXXXXXX"
  email: "",
  addressAr: "",
  addressEn: "",
  instagram: "",
  twitter: "",
  facebook: "https://www.facebook.com/ahmed.youssef.847292",
  tiktok: "https://www.tiktok.com/@a.youssef17",
  hotline: "", // emergency / psychological-support numbers shown in the top banner
} as const;
