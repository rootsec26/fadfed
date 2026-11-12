"use client";

import { useActionState } from "react";
import { sendContactMessage } from "@/actions/contact";
import { Alert, Field, Input, Textarea, btn } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";

export function ContactForm({ t }: { t: Dictionary["contact"] }) {
  const [state, action, pending] = useActionState(sendContactMessage, undefined);

  if (state?.ok) return <Alert tone="success">{t.sent}</Alert>;

  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Field label={t.name}><Input name="name" required minLength={2} autoComplete="name" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.email}><Input name="email" type="email" required autoComplete="email" dir="ltr" /></Field>
        <Field label={t.phone}><Input name="phone" type="tel" autoComplete="tel" dir="ltr" /></Field>
      </div>
      <Field label={t.message}><Textarea name="message" required minLength={5} /></Field>
      <p className="text-xs text-ink-soft">{t.privacyNote}</p>
      <button type="submit" disabled={pending} className={btn("primary", "md", "w-full sm:w-auto")}>
        {pending ? t.sending : t.send}
      </button>
    </form>
  );
}
