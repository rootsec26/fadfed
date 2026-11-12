"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { btn } from "@/components/ui";

/** Submit button that disables itself while a server action is running. */
export function SubmitButton({
  children,
  pendingText,
  variant,
  size,
  className,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: Parameters<typeof btn>[0];
  size?: Parameters<typeof btn>[1];
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btn(variant, size, className)}>
      {pending ? (pendingText ?? "...") : children}
    </button>
  );
}
