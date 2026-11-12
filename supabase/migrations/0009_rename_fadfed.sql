-- 0009_rename_fadfed.sql
-- Platform rebrand: Sakina / سكينة -> Fadfed / فضفض.
-- Only rewrites clinic_settings names that still hold the old brand text,
-- so a custom name set by the doctor is never overwritten.

update public.clinic_settings
set clinic_name_ar = 'فضفض',
    clinic_name_en = 'Fadfed'
where id = 1
  and (
    clinic_name_ar in ('عيادة سكينة للصحة النفسية', 'سكينة', 'Sakeena', 'Sakeena Mental Health Clinic')
    or clinic_name_en in ('Sakeena Mental Health Clinic', 'Sakeena Clinic', 'Sakina', 'Sakina Clinic')
    or clinic_name_ar like '%سكينة%' or clinic_name_en ilike '%sakina%' or clinic_name_en ilike '%sakeena%'
  );
