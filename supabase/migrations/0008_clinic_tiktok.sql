-- 0008_clinic_tiktok.sql
-- Add TikTok URL to clinic settings (matches src/db/schema.ts) and backfill
-- the public social links only where they are empty — never overwrite a
-- value the doctor may have set.

alter table public.clinic_settings add column if not exists tiktok text;

update public.clinic_settings
set facebook = 'https://www.facebook.com/ahmed.youssef.847292'
where id = 1 and (facebook is null or btrim(facebook) = '');

update public.clinic_settings
set tiktok = 'https://www.tiktok.com/@a.youssef17'
where id = 1 and (tiktok is null or btrim(tiktok) = '');
