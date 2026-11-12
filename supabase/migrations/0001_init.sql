-- 0001_init.sql
-- Core schema for the psychologist booking platform.
-- Column names match src/db/schema.ts exactly.
-- IDs are uuid (gen_random_uuid) except sessions.id (token hash, text PK)
-- and clinic_settings.id (integer singleton row, fixed at 1).

create extension if not exists pgcrypto;

-- Idempotent: drop our tables/types if a previous partial run created them.
drop table if exists public.notification_log cascade;
drop table if exists public.clinic_settings cascade;
drop table if exists public.contact_messages cascade;
drop table if exists public.messages cascade;
drop table if exists public.assessments cascade;
drop table if exists public.testimonials cascade;
drop table if exists public.articles cascade;
drop table if exists public.session_notes cascade;
drop table if exists public.appointments cascade;
drop table if exists public.days_off cascade;
drop table if exists public.availability_rules cascade;
drop table if exists public.services cascade;
drop table if exists public.intake_forms cascade;
drop table if exists public.patients cascade;
drop table if exists public.sessions cascade;
drop table if exists public.users cascade;
drop table if exists public.profiles cascade;
drop function if exists public.set_updated_at() cascade;

-- Role enum (matches drizzle pgEnum "role").
drop type if exists public."role" cascade;
create type public."role" as enum ('patient', 'doctor');

-- updated_at trigger function (shared by all tables)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

/* ─────────────────────────── Auth ─────────────────────────── */

-- Supabase Auth profile (references auth.users; only exists on Supabase)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  phone text,
  role public."role" not null default 'patient',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create unique index profiles_email_idx on public.profiles (email);

-- Legacy/custom auth user table (kept alongside profiles during transition)
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text,
  google_id text unique,
  name text not null,
  phone text,
  role public."role" not null default 'patient',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index users_role_idx on public.users (role);

create table public.sessions (
  id text primary key, -- sha256 of the cookie token
  user_id uuid not null references public.users(id) on delete cascade,
  expires_at timestamp not null,
  created_at timestamp not null default now()
);
create index sessions_user_id_idx on public.sessions (user_id);
create index sessions_expires_at_idx on public.sessions (expires_at);

/* ─────────────────────────── Patients ─────────────────────────── */

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.users(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  birth_date text,
  gender text,
  emergency_contact text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index patients_email_idx on public.patients (email);

create table public.intake_forms (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null unique references public.patients(id) on delete cascade,
  reason text not null,
  history text,
  previous_therapy text,
  medications text,
  consent_at timestamp not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

/* ───────────────────── Services & availability ───────────────────── */

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_ar text not null,
  title_en text,
  description_ar text not null,
  description_en text,
  price integer not null default 0,
  duration_min integer not null default 50,
  mode text not null default 'both' check (mode in ('online', 'clinic', 'both')),
  icon text not null default 'user',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index services_active_idx on public.services (active);
create index services_sort_order_idx on public.services (sort_order);

-- weekday: 0 = Sunday … 6 = Saturday. One optional break per rule.
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  weekday integer not null check (weekday between 0 and 6),
  start_time text not null,
  end_time text not null,
  break_start text,
  break_end text,
  active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index availability_rules_weekday_idx on public.availability_rules (weekday);
create index availability_rules_active_idx on public.availability_rules (active);

create table public.days_off (
  id uuid primary key default gen_random_uuid(),
  date text not null unique,
  reason text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

/* ──────────────────── Appointments & notes ──────────────────── */

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  manage_token text not null unique,
  patient_id uuid not null references public.patients(id) on delete cascade,
  service_id uuid not null references public.services(id),
  date text not null,
  start_time text not null,
  end_time text not null,
  duration_min integer not null,
  session_type text not null check (session_type in ('online', 'clinic')),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  meeting_url text,
  patient_note text,
  price integer not null default 0,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  cancelled_by text check (cancelled_by in ('patient', 'doctor')),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index appointments_patient_id_idx on public.appointments (patient_id);
create index appointments_service_id_idx on public.appointments (service_id);
create index appointments_date_idx on public.appointments (date);
create index appointments_status_idx on public.appointments (status);
-- Prevents two active bookings starting at the exact same slot.
create unique index appointments_active_slot_idx
  on public.appointments (date, start_time)
  where status in ('pending', 'confirmed');

-- PRIVATE: only ever queried from doctor-only code paths.
create table public.session_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  content text not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index session_notes_patient_id_idx on public.session_notes (patient_id);
create index session_notes_appointment_id_idx on public.session_notes (appointment_id);

/* ─────────────────────────── Content ─────────────────────────── */

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_ar text not null,
  title_en text,
  excerpt_ar text not null,
  excerpt_en text,
  content_ar text not null,
  content_en text,
  category text not null default 'عام',
  published boolean not null default false,
  published_at timestamp not null default now(),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index articles_published_idx on public.articles (published);
create index articles_category_idx on public.articles (category);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text,
  text_ar text not null,
  text_en text,
  rating integer not null default 5 check (rating between 1 and 5),
  published boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index testimonials_published_idx on public.testimonials (published);

/* ───────────────────── Patient features ───────────────────── */

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  type text not null check (type in ('phq9', 'gad7')),
  answers jsonb not null,
  score integer not null,
  severity text not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index assessments_patient_id_idx on public.assessments (patient_id);
create index assessments_type_idx on public.assessments (type);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  sender text not null check (sender in ('patient', 'doctor')),
  body text not null,
  read_at timestamp,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index messages_patient_id_idx on public.messages (patient_id);
create index messages_read_at_idx on public.messages (read_at);
create index messages_sender_idx on public.messages (sender);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  handled boolean not null default false,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index contact_messages_handled_idx on public.contact_messages (handled);
create index contact_messages_created_at_idx on public.contact_messages (created_at);

/* ───────────────────── Settings & logs ───────────────────── */

create table public.clinic_settings (
  id integer primary key default 1 check (id = 1), -- singleton row
  doctor_name_ar text not null,
  doctor_name_en text not null,
  title_ar text not null,
  title_en text not null,
  clinic_name_ar text not null,
  clinic_name_en text not null,
  address_ar text not null,
  address_en text not null,
  phone text not null,
  whatsapp text not null, -- digits only, with country code
  email text not null,
  instagram text,
  twitter text,
  facebook text,
  hotline text not null, -- emergency numbers placeholder
  currency_ar text not null default 'ج.م',
  currency_en text not null default 'EGP',
  timezone text not null default 'Asia/Riyadh',
  slot_step_min integer not null default 30,
  min_notice_hours integer not null default 4,
  cancel_window_hours integer not null default 24,
  notify_email boolean not null default true,
  notify_whatsapp boolean not null default true,
  notify_doctor boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- Mock integrations write here instead of sending real emails/WhatsApp.
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email', 'whatsapp')),
  recipient text not null,
  subject text,
  body text not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index notification_log_created_at_idx on public.notification_log (created_at);
create index notification_log_channel_idx on public.notification_log (channel);

/* ──────────────────── updated_at triggers ──────────────────── */

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.sessions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.patients
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.intake_forms
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.services
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.availability_rules
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.days_off
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.session_notes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.articles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.testimonials
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.assessments
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.messages
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.contact_messages
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.clinic_settings
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.notification_log
  for each row execute function public.set_updated_at();
