/**
 * Small shadcn-style UI kit (Tailwind only, no extra deps).
 * To migrate to real shadcn/ui later, replace these exports one by one.
 */
import type { ComponentProps, ReactNode } from "react";

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "whatsapp";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/15 focus-visible:ring-brand-600/40",
  secondary: "bg-sand-100 text-brand-800 hover:bg-sand-200",
  outline: "border border-brand-200 bg-white text-brand-700 hover:bg-brand-50",
  ghost: "text-ink-soft hover:bg-sand-100",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  whatsapp: "bg-[#25D366] text-white hover:bg-[#1fb957]",
};
const sizes: Record<Size, string> = {
  // min-h-11 keeps touch targets >= 44px on mobile/tablet; lg restores compact sizing.
  sm: "min-h-11 px-3.5 py-1.5 text-sm lg:min-h-0",
  md: "min-h-11 px-5 py-2.5 text-sm lg:min-h-0",
  lg: "px-7 py-3.5 text-base",
};

/** Class helper – use on <Link>, <a> or <button>. */
export const btn = (variant: Variant = "primary", size: Size = "md", extra?: string) =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
    variants[variant],
    sizes[size],
    extra,
  );

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={btn(variant, size, className)} {...props} />;
}

const field =
  "w-full rounded-2xl border border-sand-200 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15";

export const Input = ({ className, ...p }: ComponentProps<"input">) => (
  <input className={cn(field, className)} {...p} />
);
export const Textarea = ({ className, ...p }: ComponentProps<"textarea">) => (
  <textarea className={cn(field, "min-h-28 resize-y", className)} {...p} />
);
export const Select = ({ className, ...p }: ComponentProps<"select">) => (
  <select className={cn(field, className)} {...p} />
);

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function Checkbox({ children, ...p }: ComponentProps<"input"> & { children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
      <input type="checkbox" className="mt-1 size-4 shrink-0 accent-brand-600" {...p} />
      <span>{children}</span>
    </label>
  );
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-3xl border border-sand-200/80 bg-white p-6 shadow-sm shadow-sand-300/20", className)}
      {...p}
    />
  );
}

const badgeTones = {
  neutral: "bg-sand-100 text-sand-700",
  green: "bg-sage-100 text-sage-700",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-rose-100 text-rose-700",
  blue: "bg-brand-100 text-brand-800",
};
export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof badgeTones;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", badgeTones[tone], className)}>
      {children}
    </span>
  );
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success" | "warning";
  children: ReactNode;
}) {
  const tones = {
    info: "bg-brand-50 text-brand-800 border-brand-200",
    error: "bg-rose-50 text-rose-800 border-rose-200",
    success: "bg-sage-50 text-sage-700 border-sage-200",
    warning: "bg-amber-50 text-amber-900 border-amber-200",
  };
  return <div className={cn("rounded-2xl border px-4 py-3 text-sm leading-relaxed", tones[tone])}>{children}</div>;
}

export const statusTone = (s: string) =>
  s === "confirmed" || s === "completed" ? "green" : s === "pending" ? "amber" : s === "cancelled" || s === "no_show" ? "red" : "neutral";
