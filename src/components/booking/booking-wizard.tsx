"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock, Monitor, Building2 } from "lucide-react";
import { createBooking } from "@/actions/booking";
import { SlotPicker } from "@/components/booking/slot-picker";
import { Alert, Card, Checkbox, Field, Input, Textarea, btn, cn } from "@/components/ui";
import type { Dictionary, Lang } from "@/lib/i18n";
import { formatDate, formatTime } from "@/lib/time";

export type WizardService = {
  id: number;
  title: string;
  description: string;
  price: number;
  durationMin: number;
  mode: "online" | "clinic" | "both";
};

type Props = {
  services: WizardService[];
  currency: string;
  lang: Lang;
  t: Dictionary;
  initialServiceId?: number;
  prefill: { name: string; email: string; phone: string } | null;
};

/** Booking flow: service → date & time → details → review & confirm. */
export function BookingWizard({ services, currency, lang, t, initialServiceId, prefill }: Props) {
  const b = t.booking;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(initialServiceId ? 1 : 0);
  const [serviceId, setServiceId] = useState<number | null>(initialServiceId ?? null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<"online" | "clinic" | null>(null);
  const [form, setForm] = useState({
    name: prefill?.name ?? "",
    email: prefill?.email ?? "",
    phone: prefill?.phone ?? "",
    note: "",
  });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const effectiveType = service ? (service.mode === "both" ? sessionType : service.mode) : null;
  const detailsValid =
    form.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email) && form.phone.trim().length >= 6 && !!effectiveType;

  const canNext = [!!service, !!date && !!time, detailsValid, consent][step];

  function submit() {
    if (!service || !date || !time || !effectiveType) return;
    setError(null);
    startTransition(async () => {
      const res = await createBooking({
        serviceId: service.id,
        date,
        time,
        sessionType: effectiveType,
        name: form.name,
        email: form.email,
        phone: form.phone,
        note: form.note,
        consent: consent as true,
      });
      if (res.ok) router.push(`/appointments/${res.token}?new=1`);
      else {
        setError(res.error);
        if (res.error === b.errors.unavailable) {
          setTime(null);
          setStep(1);
        }
      }
    });
  }

  return (
    <div>
      {/* progress */}
      <ol className="mb-8 grid grid-cols-4 gap-2">
        {b.steps.map((label, i) => (
          <li key={label} className="text-center">
            <div className={cn("h-1.5 rounded-full transition-all", i <= step ? "bg-brand-500" : "bg-sand-200")} />
            <span className={cn("mt-2 block text-xs font-semibold sm:text-sm", i === step ? "text-brand-700" : "text-ink-soft")}>
              {i + 1}. {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="animate-fade-in" key={step}>
        {/* 1 – service */}
        {step === 0 && (
          <div>
            <h2 className="mb-4 text-xl font-extrabold text-brand-900">{b.chooseService}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setServiceId(s.id);
                    setDate(null);
                    setTime(null);
                    setSessionType(null);
                  }}
                  className={cn(
                    "cursor-pointer rounded-3xl border bg-white p-5 text-start transition",
                    s.id === serviceId ? "border-brand-600 ring-4 ring-brand-100" : "border-sand-200 hover:border-brand-300",
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-bold text-brand-900">{s.title}</span>
                    {s.id === serviceId && <Check className="size-5 text-brand-600" />}
                  </span>
                  <span className="mt-2 block text-sm leading-7 text-ink-soft">{s.description}</span>
                  <span className="mt-3 flex items-center gap-4 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-ink-soft"><Clock className="size-4" />{s.durationMin} {t.common.minutes}</span>
                    {s.price > 0 && <span className="font-bold text-brand-700">{s.price} {currency}</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2 – date & time */}
        {step === 1 && service && (
          <SlotPicker
            durationMin={service.durationMin}
            lang={lang}
            t={b}
            date={date}
            time={time}
            onChange={(d, tm) => {
              setDate(d);
              setTime(tm);
            }}
          />
        )}

        {/* 3 – details */}
        {step === 2 && service && (
          <div className="space-y-5">
            <h2 className="text-xl font-extrabold text-brand-900">{b.details}</h2>
            {prefill ? (
              <Alert>{b.loggedAs}</Alert>
            ) : (
              <p className="text-sm text-ink-soft">
                <Link href="/login?next=/book" className="font-bold text-brand-600 hover:underline">{b.loginHint}</Link>
              </p>
            )}
            {service.mode === "both" && (
              <div>
                <p className="mb-2 text-sm font-semibold">{b.sessionType}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["online", Monitor, b.online, b.onlineHint],
                    ["clinic", Building2, b.clinic, b.clinicHint],
                  ] as const).map(([key, Icon, label, hint]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSessionType(key)}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-3xl border bg-white p-4 text-start transition",
                        sessionType === key ? "border-brand-600 ring-4 ring-brand-100" : "border-sand-200 hover:border-brand-300",
                      )}
                    >
                      <Icon className="mt-0.5 size-5 text-brand-500" />
                      <span><span className="block font-bold text-brand-900">{label}</span><span className="text-xs text-ink-soft">{hint}</span></span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Field label={b.name}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={b.email}><Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></Field>
              <Field label={b.phone}><Input type="tel" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" /></Field>
            </div>
            <Field label={b.note}><Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="min-h-20" /></Field>
          </div>
        )}

        {/* 4 – review */}
        {step === 3 && service && date && time && effectiveType && (
          <div className="space-y-5">
            <h2 className="text-xl font-extrabold text-brand-900">{b.review}</h2>
            <Card className="space-y-3 text-sm">
              {[
                [b.service, service.title],
                [b.date, formatDate(date, lang)],
                [b.time, formatTime(time, lang)],
                [b.sessionType, effectiveType === "online" ? b.online : b.clinic],
                [b.name, form.name],
                [b.email, form.email],
                [b.phone, form.phone],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-sand-100 pb-2 last:border-0">
                  <span className="text-ink-soft">{k}</span>
                  <span className="font-semibold text-ink">{v}</span>
                </div>
              ))}
              {service.price > 0 && (
                <div className="flex justify-between gap-4 pt-1">
                  <span className="text-ink-soft">{t.common.price}</span>
                  <span className="font-extrabold text-brand-700">{service.price} {currency}</span>
                </div>
              )}
            </Card>
            <p className="text-xs text-ink-soft">{b.payment}</p>
            <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)}>
              {b.consent}{" "}
              <Link href="/privacy" target="_blank" className="font-semibold text-brand-600 underline">{t.footer.privacy}</Link>
            </Checkbox>
          </div>
        )}
      </div>

      {error && <div className="mt-5"><Alert tone="error">{error}</Alert></div>}

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0 || pending}
          className={btn("ghost", "md", step === 0 ? "invisible" : "")}
        >
          {b.back}
        </button>
        {step < 3 ? (
          <button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)} className={btn("primary", "lg")}>
            {b.next}
          </button>
        ) : (
          <button type="button" disabled={!canNext || pending} onClick={submit} className={btn("primary", "lg")}>
            {pending ? b.confirming : b.confirm}
          </button>
        )}
      </div>
    </div>
  );
}
