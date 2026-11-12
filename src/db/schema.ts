import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Database schema.
 *
 * Dates are stored as clinic-local text ("YYYY-MM-DD") and times as "HH:MM"
 * so that availability logic never has to deal with timezone conversions.
 * Access control is enforced in the application layer (see src/lib/auth.ts):
 *  - only role "doctor" can read session_notes / all patients
 *  - patients can only read rows that belong to their own `patients` record
 */

export const roleEnum = pgEnum("role", ["patient", "doctor"]);

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";
export type SessionType = "online" | "clinic";

/* ───────────── Auth ───────────── */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: roleEnum("role").notNull().default("patient"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256 of the cookie token
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
});

/* ───────────── Patients ───────────── */

export const patients = pgTable("patients", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .unique()
    .references(() => users.id, { onDelete: "set null" }),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  birthDate: text("birth_date"),
  gender: text("gender"),
  emergencyContact: text("emergency_contact"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const intakeForms = pgTable("intake_forms", {
  id: serial("id").primaryKey(),
  patientId: uuid("patient_id")
    .notNull()
    .unique()
    .references(() => patients.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  history: text("history"),
  previousTherapy: text("previous_therapy"),
  medications: text("medications"),
  consentAt: timestamp("consent_at").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ───────────── Services & availability ───────────── */

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en"),
  descriptionAr: text("description_ar").notNull(),
  descriptionEn: text("description_en"),
  price: integer("price").notNull().default(0),
  durationMin: integer("duration_min").notNull().default(50),
  mode: text("mode").$type<"online" | "clinic" | "both">().notNull().default("both"),
  icon: text("icon").notNull().default("user"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** weekday: 0 = Sunday … 6 = Saturday. One optional break per rule. */
export const availabilityRules = pgTable("availability_rules", {
  id: serial("id").primaryKey(),
  weekday: integer("weekday").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  breakStart: text("break_start"),
  breakEnd: text("break_end"),
  active: boolean("active").notNull().default(true),
});

export const daysOff = pgTable("days_off", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  reason: text("reason"),
});

/* ───────────── Appointments & notes ───────────── */

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    manageToken: text("manage_token").notNull().unique(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id),
    date: text("date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    durationMin: integer("duration_min").notNull(),
    sessionType: text("session_type").$type<SessionType>().notNull(),
    status: text("status").$type<AppointmentStatus>().notNull().default("pending"),
    meetingUrl: text("meeting_url"),
    patientNote: text("patient_note"),
    price: integer("price").notNull().default(0),
    paymentStatus: text("payment_status").notNull().default("unpaid"),
    cancelledBy: text("cancelled_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("appointments_date_idx").on(t.date),
    // Prevents two active bookings starting at the exact same slot.
    uniqueIndex("appointments_active_slot_idx")
      .on(t.date, t.startTime)
      .where(sql`${t.status} in ('pending','confirmed')`),
  ],
);

/** PRIVATE: only ever queried from doctor-only code paths. */
export const sessionNotes = pgTable("session_notes", {
  id: serial("id").primaryKey(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id, {
    onDelete: "set null",
  }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ───────────── Content ───────────── */

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en"),
  excerptAr: text("excerpt_ar").notNull(),
  excerptEn: text("excerpt_en"),
  contentAr: text("content_ar").notNull(),
  contentEn: text("content_en"),
  category: text("category").notNull().default("عام"),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
});

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  textAr: text("text_ar").notNull(),
  textEn: text("text_en"),
  rating: integer("rating").notNull().default(5),
  published: boolean("published").notNull().default(true),
});

export const videoSourceEnum = pgEnum("video_source", [
  "youtube",
  "vimeo",
  "tiktok",
  "instagram",
  "facebook",
  "direct",
  "external",
  "upload",
]);
export type VideoSource = (typeof videoSourceEnum.enumValues)[number];

/**
 * Public videos. Metadata only — files live in Supabase Storage
 * (`storage_key`), external videos in `video_url`. Rows stay tiny so the
 * free-tier database never stores media.
 */
export const videos = pgTable(
  "videos",
  {
    id: serial("id").primaryKey(),
    titleAr: text("title_ar").notNull(),
    titleEn: text("title_en"),
    descriptionAr: text("description_ar"),
    descriptionEn: text("description_en"),
    sourceType: videoSourceEnum("source_type").notNull(),
    /** Watch page URL for youtube/vimeo, or the public storage URL for uploads. */
    videoUrl: text("video_url").notNull(),
    /** Path inside the storage bucket / Cloudinary public_id; null for external links. */
    storageKey: text("storage_key"),
    /** Cloudinary public_id of an uploaded thumbnail (for cleanup on delete). */
    thumbKey: text("thumb_key"),
    thumbnailUrl: text("thumbnail_url"),
    category: text("category"),
    durationSeconds: integer("duration_seconds"),
    isPublished: boolean("is_published").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("videos_published_sort_idx").on(t.isPublished, t.sortOrder),
    index("videos_created_idx").on(t.createdAt),
  ],
);

export type LiveSessionStatus = "scheduled" | "live" | "ended" | "cancelled";

/**
 * Private 1:1 live therapy sessions (Daily.co video room or a manual link
 * pasted by the doctor). `patientId` is the auth user, not the `patients`
 * row, so guest bookings can never own a live session.
 */
export const liveSessions = pgTable(
  "live_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(50),
    status: text("status").$type<LiveSessionStatus>().notNull().default("scheduled"),
    roomName: text("room_name"),
    manualLink: text("manual_link"),
    patientConsentAt: timestamp("patient_consent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("live_sessions_patient_idx").on(t.patientId),
    index("live_sessions_scheduled_idx").on(t.scheduledAt),
  ],
);

/* ───────────── Patient features ───────────── */

export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  type: text("type").$type<"phq9" | "gad7">().notNull(),
  answers: jsonb("answers").$type<number[]>().notNull(),
  score: integer("score").notNull(),
  severity: text("severity").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  sender: text("sender").$type<"patient" | "doctor">().notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  handled: boolean("handled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ───────────── Settings & logs ───────────── */

export const clinicSettings = pgTable("clinic_settings", {
  id: integer("id").primaryKey().default(1),
  doctorNameAr: text("doctor_name_ar").notNull(),
  doctorNameEn: text("doctor_name_en").notNull(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  clinicNameAr: text("clinic_name_ar").notNull(),
  clinicNameEn: text("clinic_name_en").notNull(),
  addressAr: text("address_ar").notNull(),
  addressEn: text("address_en").notNull(),
  phone: text("phone").notNull(),
  whatsapp: text("whatsapp").notNull(), // digits only, with country code
  email: text("email").notNull(),
  instagram: text("instagram"),
  twitter: text("twitter"),
  facebook: text("facebook"),
  tiktok: text("tiktok"),
  hotline: text("hotline").notNull(), // emergency numbers placeholder
  currencyAr: text("currency_ar").notNull().default("ج.م"),
  currencyEn: text("currency_en").notNull().default("EGP"),
  timezone: text("timezone").notNull().default("Asia/Riyadh"),
  slotStepMin: integer("slot_step_min").notNull().default(30),
  minNoticeHours: integer("min_notice_hours").notNull().default(4),
  cancelWindowHours: integer("cancel_window_hours").notNull().default(24),
  notifyEmail: boolean("notify_email").notNull().default(true),
  notifyWhatsapp: boolean("notify_whatsapp").notNull().default(true),
  notifyDoctor: boolean("notify_doctor").notNull().default(true),
});

/** Mock integrations write here instead of sending real emails/WhatsApp. */
export const notificationLog = pgTable("notification_log", {
  id: serial("id").primaryKey(),
  channel: text("channel").notNull(), // email | whatsapp
  recipient: text("recipient").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
