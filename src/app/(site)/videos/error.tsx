"use client";

import { useEffect } from "react";
import { CircleAlert } from "lucide-react";

export default function VideosError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="mx-auto flex max-w-md flex-col items-center px-5 py-24 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-rose-50 text-rose-600">
        <CircleAlert className="size-8" />
      </span>
      <p className="mt-5 text-lg font-bold text-brand-900">حصل خطأ أثناء تحميل الفيديوهات / Something went wrong</p>
      <p className="mt-2 text-sm leading-7 text-ink-soft">جرّب تاني بعد شوية / Please try again in a moment.</p>
      <button
        onClick={reset}
        className="mt-6 cursor-pointer rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        إعادة المحاولة / Retry
      </button>
    </section>
  );
}
