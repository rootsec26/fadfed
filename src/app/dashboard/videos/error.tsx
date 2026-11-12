"use client";

import { useEffect } from "react";
import { Alert } from "@/components/ui";

export default function VideosError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="space-y-4">
      <Alert tone="error">حصل خطأ أثناء تحميل الفيديوهات. جرّب تاني.</Alert>
      <button
        onClick={reset}
        className="cursor-pointer rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
