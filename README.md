# منصة الأخصائي النفسي – MVP v1

Arabic-first (RTL, with English toggle) website + booking system + patient area + doctor dashboard.
**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · PostgreSQL + Drizzle ORM · zod · lucide-react.

> **Why not Supabase / shadcn CLI?** The sandbox ships a local PostgreSQL, so auth, sessions and
> role-based access are implemented in the app layer (see "Security model"). The UI kit in
> `src/components/ui.tsx` is shadcn-style (Tailwind only) and can be swapped for real shadcn/ui later.
> The schema is plain Postgres, so moving to Supabase (Auth + RLS) later is straightforward.

## Run it

```bash
npm install
# .env must contain DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
npx drizzle-kit push        # creates the tables from src/db/schema.ts
npm run dev                 # http://localhost:3000
```

On the first request with an empty database, demo data is inserted automatically
(`src/db/seed.ts`; disable with `AUTO_SEED=false`).

| Role    | Email                 | Password     |
|---------|-----------------------|--------------|
| Doctor  | doctor@example.com    | Doctor@123   |
| Patient | patient@example.com   | Patient@123  |

Remove the demo hint in `src/components/site/auth-form.tsx` and the seed users before going live.

Optional env vars: `APP_URL` (public base URL used in emails), `COOKIE_SECURE=true` (set behind HTTPS),
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (enables "Continue with Google"; redirect URI:
`{APP_URL}/api/auth/google/callback`).

## Sitemap

```
Public      /  /about  /services  /blog  /blog/[slug]  /contact  /book
            /appointments/[token] (confirmation · cancel · reschedule)  /privacy  /terms  /login  /signup
Patient     /account  /account/intake  /account/assessments(/[type])  /account/messages  /account/profile
Doctor      /admin  /admin/appointments(/[id])  /admin/calendar  /admin/patients(/[id])  /admin/messages
            /admin/services  /admin/articles  /admin/testimonials  /admin/settings
```

## Folder structure

```
src/
  app/
    (site)/            public pages (header, footer, emergency banner, WhatsApp button)
    account/           patient area (Arabic, login required)
    admin/             doctor dashboard (Arabic, role = doctor)
    api/               /api/health, /api/availability, /api/auth/google(/callback)
  actions/             server actions: auth, booking, patient, admin (doctor-only), contact
  components/
    ui.tsx             Button/Input/Card/Badge/Alert + `btn()` class helper
    site/              header, footer, forms, hero helpers…
    booking/           booking wizard, slot picker, reschedule form
    dashboard/         shell + nav + admin helpers
  db/
    schema.ts          all tables (Drizzle)
    seed.ts            demo data (auto-run on empty DB)
  lib/
    auth.ts            scrypt passwords, DB sessions, requireUser/requireDoctor/requirePatient
    slots.ts           availability engine (rules, breaks, days off, bookings, notice period)
    appointments.ts    load/cancel rules + notification messages
    assessments.ts     PHQ-9 / GAD-7 questions & scoring
    integrations/      MOCK providers: notify (email/WhatsApp), video (Jitsi), payments
    i18n/              ar.ts (primary) · en.ts · index.ts (getI18n, pick)
```

## Database schema (`src/db/schema.ts`)

`users` · `sessions` · `patients` · `intake_forms` · `services` · `availability_rules` · `days_off` ·
`appointments` · `session_notes` (doctor-private) · `articles` · `testimonials` · `assessments` ·
`messages` · `contact_messages` · `clinic_settings` · `notification_log`

Dates are clinic-local text (`YYYY-MM-DD`) and times `HH:MM`, so there is no timezone arithmetic in booking logic.
A partial unique index prevents two active appointments from starting at the same time.

## Security model (very important for v1)

- Passwords: scrypt + per-user salt. Sessions: random token in an httpOnly cookie, only its SHA-256 is stored.
- Roles: `patient` / `doctor`. Every `/admin` page **and** every doctor server action calls `requireDoctor()`.
  Patient pages/actions only touch the logged-in patient's own `patients` row.
- `session_notes` is queried only from doctor-only code. Patients never receive it.
- Guest bookings are managed through a 48-hex-char secret token link; guest records are **not** auto-merged into
  accounts until email verification exists (prevents someone claiming another person's history).
- Emergency banner on every public page and patient page; hotline numbers editable in Admin → Settings.
- Educational disclaimers in the footer, articles, and questionnaires (PHQ-9/GAD-7 clearly marked "not a diagnosis";
  PHQ-9 item 9 shows a safety message).
- Policy/terms texts are **placeholders** – have a legal advisor review them.

## How to edit

- **Texts (public site):** `src/lib/i18n/ar.ts` then mirror in `en.ts` (TypeScript enforces the same shape).
  About-the-doctor text lives in the `about` section there.
- **Services, prices, articles, testimonials, clinic info, hours, hotline:** Admin dashboard (no code needed).
- **Colors / fonts:** `@theme` block in `src/app/globals.css`, font link in `src/app/layout.tsx`.
- **Real email / WhatsApp:** implement `sendEmail` / `sendWhatsApp` in `src/lib/integrations/notify.ts`.
- **Video provider:** `src/lib/integrations/video.ts` (currently public Jitsi rooms).
- **Payments:** `src/lib/integrations/payments.ts` (currently a no-op; payment at clinic).
- Patient and doctor areas are Arabic-only in v1 (public site + booking are fully bilingual).

## Suggested next features

1. Email verification + password reset; rate-limit login; optional 2FA for the doctor.
2. Real email/WhatsApp providers, appointment reminders (24h / 1h) via a cron job.
3. Real payments (Moyasar / Stripe / PayTabs), deposits, refunds, invoices/receipts.
4. Zoom / Google Meet API for unique meeting links; waiting room.
5. Google Calendar two-way sync for the doctor.
6. Move to Supabase Auth + Row Level Security (policies mirroring the role checks above) and encrypt notes at rest.
7. Rich-text / markdown editor and cover images for articles; image upload for the doctor's photo.
8. Full English version of the patient and admin areas.
9. Packages / recurring sessions, waitlist, no-show fees.
10. Treatment plans, homework assignments, mood tracker, PHQ-9/GAD-7 trend charts.
11. Audit log of who viewed patient records; data export & deletion requests (GDPR-style).
12. Secure file sharing (reports, prescriptions) and e-consent signatures.
13. Analytics dashboard (retention, revenue, no-show rate) and SEO (sitemap, OpenGraph, structured data).
