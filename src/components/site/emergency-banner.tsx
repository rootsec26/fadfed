import { LifeBuoy } from "lucide-react";
import { getI18n } from "@/lib/i18n";
import { doctorProfile } from "@/lib/profile";

/** Always-visible safety notice. Hotline numbers live in src/lib/profile.ts. */
export async function EmergencyBanner() {
  const { t } = await getI18n();
  return (
    <div className="bg-rose-50 text-rose-900">
      <div className="mx-auto flex max-w-6xl items-start gap-2.5 px-5 py-2 text-xs leading-relaxed sm:items-center sm:text-sm">
        <LifeBuoy className="mt-0.5 size-4 shrink-0 sm:mt-0" />
        <p>
          <strong className="font-bold">{t.emergency.title}</strong> {t.emergency.text}
          {doctorProfile.hotline && (
            <span className="font-semibold">
              {" "}{t.emergency.hotline} {doctorProfile.hotline}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
