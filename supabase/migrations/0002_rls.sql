-- 0002_rls.sql
-- Row Level Security for all tables.
--
-- The app itself connects with the service role / direct Postgres
-- (DATABASE_URL), which bypasses RLS — these policies protect the
-- anon + authenticated keys (browser Supabase client).
--
-- Auth model note: the app has BOTH a custom `users` table (cookie
-- sessions) and a Supabase-Auth-backed `profiles` table. RLS policies
-- below key off `auth.uid()` → `profiles`. Patient ownership is resolved
-- by matching the profile email to `patients.email` (the `patients`
-- table links to the legacy `users` table, not to `auth.users`).

-- Idempotent: drop any policies we previously created on our tables.
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles','users','sessions','patients','intake_forms','services',
        'availability_rules','days_off','appointments','session_notes',
        'articles','testimonials','assessments','messages','contact_messages',
        'clinic_settings','notification_log'
      )
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

/* ── Helper functions ─────────────────────────────────────────── */

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid();
$$;

create or replace function public.is_doctor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'doctor'
  );
$$;

-- Ids of patient rows owned by the currently authenticated user.
create or replace function public.my_patient_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.patients p
  join public.profiles pr on lower(pr.email) = lower(p.email)
  where pr.id = auth.uid();
$$;

/* ── Enable RLS on every table ────────────────────────────────── */

alter table public.profiles enable row level security;
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.patients enable row level security;
alter table public.intake_forms enable row level security;
alter table public.services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.days_off enable row level security;
alter table public.appointments enable row level security;
alter table public.session_notes enable row level security;
alter table public.articles enable row level security;
alter table public.testimonials enable row level security;
alter table public.assessments enable row level security;
alter table public.messages enable row level security;
alter table public.contact_messages enable row level security;
alter table public.clinic_settings enable row level security;
alter table public.notification_log enable row level security;

/* ── profiles ─────────────────────────────────────────────────── */
-- Users manage their own profile; doctors can read all profiles.

create policy "profiles_select_own_or_doctor" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_doctor());

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

/* ── users / sessions (legacy custom auth) ──────────────────────
   These hold password hashes and session tokens. No client-side
   access at all — the app server reads them via service role. */

revoke all on public.users from anon, authenticated;
revoke all on public.sessions from anon, authenticated;

/* ── Public content: readable by everyone ─────────────────────── */

create policy "services_public_read" on public.services
  for select to anon, authenticated using (true);

create policy "availability_public_read" on public.availability_rules
  for select to anon, authenticated using (true);

create policy "days_off_public_read" on public.days_off
  for select to anon, authenticated using (true);

create policy "clinic_settings_public_read" on public.clinic_settings
  for select to anon, authenticated using (true);

create policy "articles_public_read_published" on public.articles
  for select to anon, authenticated using (published = true);

create policy "testimonials_public_read_published" on public.testimonials
  for select to anon, authenticated using (published = true);

/* ── contact_messages: anyone can submit, only doctor reads ───── */

create policy "contact_messages_public_insert" on public.contact_messages
  for insert to anon, authenticated with check (true);

create policy "contact_messages_doctor_read" on public.contact_messages
  for select to authenticated using (public.is_doctor());

create policy "contact_messages_doctor_update" on public.contact_messages
  for update to authenticated
  using (public.is_doctor())
  with check (public.is_doctor());

/* ── patients: owner (matched by email) or doctor ─────────────── */

create policy "patients_select_own_or_doctor" on public.patients
  for select to authenticated
  using (id in (select public.my_patient_ids()) or public.is_doctor());

create policy "patients_insert_own" on public.patients
  for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and lower(pr.email) = lower(patients.email)
    )
  );

create policy "patients_update_own_or_doctor" on public.patients
  for update to authenticated
  using (id in (select public.my_patient_ids()) or public.is_doctor())
  with check (id in (select public.my_patient_ids()) or public.is_doctor());

/* ── patient-owned clinical data ────────────────────────────────
   intake_forms, appointments, session_notes, assessments, messages.
   Owner = patient whose email matches the profile, or a doctor. */

create policy "intake_forms_select" on public.intake_forms
  for select to authenticated
  using (patient_id in (select public.my_patient_ids()) or public.is_doctor());

create policy "intake_forms_insert_own" on public.intake_forms
  for insert to authenticated
  with check (patient_id in (select public.my_patient_ids()));

create policy "intake_forms_update_own_or_doctor" on public.intake_forms
  for update to authenticated
  using (patient_id in (select public.my_patient_ids()) or public.is_doctor())
  with check (patient_id in (select public.my_patient_ids()) or public.is_doctor());

create policy "appointments_select" on public.appointments
  for select to authenticated
  using (patient_id in (select public.my_patient_ids()) or public.is_doctor());

create policy "appointments_insert_own" on public.appointments
  for insert to authenticated
  with check (patient_id in (select public.my_patient_ids()));

create policy "appointments_update_own_or_doctor" on public.appointments
  for update to authenticated
  using (patient_id in (select public.my_patient_ids()) or public.is_doctor())
  with check (patient_id in (select public.my_patient_ids()) or public.is_doctor());

-- session_notes are doctor-only (private clinical notes).
create policy "session_notes_doctor_all" on public.session_notes
  for all to authenticated
  using (public.is_doctor())
  with check (public.is_doctor());

create policy "assessments_select" on public.assessments
  for select to authenticated
  using (patient_id in (select public.my_patient_ids()) or public.is_doctor());

create policy "assessments_insert_own" on public.assessments
  for insert to authenticated
  with check (patient_id in (select public.my_patient_ids()));

create policy "messages_select" on public.messages
  for select to authenticated
  using (patient_id in (select public.my_patient_ids()) or public.is_doctor());

create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (
    patient_id in (select public.my_patient_ids())
    or (public.is_doctor() and sender = 'doctor')
    or (patient_id in (select public.my_patient_ids()) and sender = 'patient')
  );

create policy "messages_update_own_or_doctor" on public.messages
  for update to authenticated
  using (patient_id in (select public.my_patient_ids()) or public.is_doctor())
  with check (patient_id in (select public.my_patient_ids()) or public.is_doctor());

/* ── notification_log: doctor read-only via client ────────────── */

create policy "notification_log_doctor_read" on public.notification_log
  for select to authenticated using (public.is_doctor());

/* ── Doctor-managed writes (articles, testimonials, services,
      availability_rules, days_off, clinic_settings, notification_log):
      no client write policies — mutations go through the app server
      with the service role, which bypasses RLS. */
