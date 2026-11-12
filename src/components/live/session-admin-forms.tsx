"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, Video } from "lucide-react";
import { cancelLiveSession, createLiveSession, endLiveSession, startLiveSession } from "@/actions/live-sessions";
import { useToast } from "@/components/admin/toast";
import { SubmitButton } from "@/components/submit-button";
import { btn, Card, Field, Input } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";

type T = Dictionary["live"];

export type PatientOption = { email: string; name: string };

/** Doctor assigns a session by patient EMAIL (autocomplete from registered users). */
export function CreateSessionForm({ patients, t }: { patients: PatientOption[]; t: T }) {
  const router = useRouter();
  const toast = useToast();
  const [, start] = useTransition();
  const a = t.admin;

  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold text-brand-900">{a.createTitle}</h2>
      <form
        className="grid gap-4 sm:grid-cols-2"
        action={(fd) =>
          start(async () => {
            const res = await createLiveSession({
              email: String(fd.get("email") ?? ""),
              dateTime: String(fd.get("dateTime") ?? ""),
              durationMinutes: Number(fd.get("durationMinutes") ?? 50),
              manualLink: String(fd.get("manualLink") ?? "") || undefined,
            });
            if (res.ok) {
              toast(a.created);
              router.refresh();
            } else {
              toast(res.error === "email_not_found" ? a.emailNotFound : a.startFailed, "error");
            }
          })
        }
      >
        <Field label={a.patientEmail} hint={a.patientEmailHint}>
          <Input
            name="email"
            type="email"
            required
            dir="ltr"
            list="registered-patient-emails"
            placeholder="patient@example.com"
            autoComplete="off"
          />
          <datalist id="registered-patient-emails">
            {patients.map((p) => (
              <option key={p.email} value={p.email} label={p.name} />
            ))}
          </datalist>
        </Field>
        <Field label={a.dateTime}>
          <Input name="dateTime" type="datetime-local" required />
        </Field>
        <Field label={a.durationMin}>
          <Input name="durationMinutes" type="number" min={5} max={480} defaultValue={50} required />
        </Field>
        <Field label={a.manualLinkLabel} hint={a.manualLinkHint}>
          <Input name="manualLink" type="url" dir="ltr" placeholder="https://meet.google.com/…" />
        </Field>
        <div className="sm:col-span-2">
          <SubmitButton pendingText={a.create}>{a.create}</SubmitButton>
        </div>
      </form>
    </Card>
  );
}

/** Start button used on /session/[id] for the doctor (scheduled → live → redirect). */
export function StartLiveButton({ id, label }: { id: string; label: string }) {
  const [, start] = useTransition();
  return (
    <button type="button" onClick={() => start(() => startLiveSession(id))} className={btn("primary", "md")}>
      <Video className="size-4" /> {label}
    </button>
  );
}

export function SessionRowActions({
  id,
  status,
  t,
}: {
  id: string;
  status: "scheduled" | "live" | "ended" | "cancelled";
  t: T;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState<"end" | "cancel" | null>(null);
  const a = t.admin;

  const run = (fn: () => Promise<{ ok: boolean } | void>, okMsg: string) =>
    start(async () => {
      const res = await fn();
      if (res === undefined || res.ok) {
        toast(okMsg);
        router.refresh();
      } else {
        toast(a.startFailed, "error");
      }
    });

  if (status === "ended" || status === "cancelled") return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "scheduled" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => startLiveSession(id))}
          className={btn("primary", "sm")}
        >
          <Video className="size-4" /> {a.start}
        </button>
      )}
      {status === "live" && (
        <Link href={`/session/${id}`} className={btn("primary", "sm")}>
          <LogIn className="size-4" /> {a.enter}
        </Link>
      )}
      {confirming === "end" ? (
        <span className="flex items-center gap-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setConfirming(null);
              run(() => endLiveSession(id), a.endedOk);
            }}
            className="min-h-11 cursor-pointer rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
          >
            {a.confirmEnd}
          </button>
          <button type="button" onClick={() => setConfirming(null)} className="min-h-11 cursor-pointer rounded-full px-4 py-2 text-xs font-bold text-ink-soft hover:bg-sand-100">
            ✕
          </button>
        </span>
      ) : (
        <button type="button" disabled={pending} onClick={() => setConfirming("end")} className={btn("outline", "sm")}>
          {a.end}
        </button>
      )}
      {confirming === "cancel" ? (
        <span className="flex items-center gap-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setConfirming(null);
              run(() => cancelLiveSession(id), a.cancelledOk);
            }}
            className="min-h-11 cursor-pointer rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
          >
            {a.confirmCancel}
          </button>
          <button type="button" onClick={() => setConfirming(null)} className="min-h-11 cursor-pointer rounded-full px-4 py-2 text-xs font-bold text-ink-soft hover:bg-sand-100">
            ✕
          </button>
        </span>
      ) : (
        <button type="button" disabled={pending} onClick={() => setConfirming("cancel")} className={btn("ghost", "sm")}>
          {a.cancel}
        </button>
      )}
    </div>
  );
}
