-- 0007_live_sessions.sql
-- Private 1:1 live therapy sessions (Daily.co room or manual link).
-- Column names match src/db/schema.ts exactly.
-- patient_id references auth users (not patients), so guests can't own sessions.

drop table if exists public.live_sessions cascade;
create table public.live_sessions (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references public.users(id) on delete cascade,
  scheduled_at        timestamptz not null,
  duration_minutes    integer not null default 50,
  status              text not null default 'scheduled'
                        check (status in ('scheduled','live','ended','cancelled')),
  room_name           text,
  manual_link         text,
  patient_consent_at  timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists live_sessions_patient_idx on public.live_sessions (patient_id);
create index if not exists live_sessions_scheduled_idx on public.live_sessions (scheduled_at);

-- Access control is enforced in the application layer (src/lib/auth.ts +
-- session queries): a patient only ever reads rows where patient_id equals
-- their own user id; only the doctor (requireDoctor) reads/writes others.
