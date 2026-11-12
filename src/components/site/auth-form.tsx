"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, signup } from "@/actions/auth";
import { Alert, Card, Checkbox, Field, Input, btn } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";

export function AuthForm({
  mode,
  t,
  next,
  urlError,
}: {
  mode: "login" | "signup";
  t: Dictionary["auth"];
  next?: string;
  urlError?: string;
}) {
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, undefined);
  const isLogin = mode === "login";
  const error = state?.error ?? (urlError === "google_off" ? t.googleOff : urlError === "google_fail" ? t.googleFail : undefined);
  const suffix = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <Card className="mx-auto w-full max-w-md p-7 sm:p-9">
      <h1 className="text-2xl font-extrabold text-brand-900">{isLogin ? t.loginTitle : t.signupTitle}</h1>
      <p className="mt-2 text-sm leading-7 text-ink-soft">{isLogin ? t.loginSubtitle : t.signupSubtitle}</p>

      <a href="/api/auth/google" className={btn("outline", "md", "mt-6 w-full")}>
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z" />
          <path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.8 0-5.2-1.9-6-4.5H2.4v2.8A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M6 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.4a11 11 0 0 0 0 9.8L6 14.1z" />
          <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.4 7.1L6 9.9c.8-2.6 3.2-4.5 6-4.5z" />
        </svg>
        {t.google}
      </a>
      <div className="my-5 flex items-center gap-3 text-xs text-ink-soft">
        <span className="h-px flex-1 bg-sand-200" />{t.or}<span className="h-px flex-1 bg-sand-200" />
      </div>

      <form action={action} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        {next && <input type="hidden" name="next" value={next} />}
        {!isLogin && <Field label={t.name}><Input name="name" required minLength={2} autoComplete="name" /></Field>}
        <Field label={t.email}><Input name="email" type="email" required autoComplete="email" dir="ltr" /></Field>
        {!isLogin && <Field label={t.phone}><Input name="phone" type="tel" autoComplete="tel" dir="ltr" /></Field>}
        <Field label={t.password}>
          <Input name="password" type="password" required minLength={isLogin ? 1 : 8} autoComplete={isLogin ? "current-password" : "new-password"} dir="ltr" />
        </Field>
        {!isLogin && <Checkbox name="consent" required>{t.consent}</Checkbox>}
        <button type="submit" disabled={pending} className={btn("primary", "lg", "w-full")}>
          {pending ? "..." : isLogin ? t.loginBtn : t.signupBtn}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        {isLogin ? t.noAccount : t.haveAccount}{" "}
        <Link href={(isLogin ? "/signup" : "/login") + suffix} className="font-bold text-brand-600 hover:underline">
          {isLogin ? t.signupTitle : t.loginTitle}
        </Link>
      </p>
    </Card>
  );
}
