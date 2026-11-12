"use client";

import { useRef, type ReactNode } from "react";

/** <form> that runs a server action and then resets its fields (for "add new" forms). */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      className={className}
      action={async (fd) => {
        await action(fd);
        ref.current?.reset();
      }}
    >
      {children}
    </form>
  );
}
