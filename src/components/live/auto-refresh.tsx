"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Polls router.refresh() so server components re-fetch (e.g. session status changes). */
export function AutoRefresh({ intervalMs = 7000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
