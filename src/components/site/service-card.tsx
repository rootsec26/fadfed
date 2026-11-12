import Link from "next/link";
import { Clock, Heart, Smile, User, Users, Video, Brain, type LucideIcon } from "lucide-react";
import type { services } from "@/db/schema";
import { Card, btn } from "@/components/ui";
import { pick, type Dictionary, type Lang } from "@/lib/i18n";

const icons: Record<string, LucideIcon> = { user: User, heart: Heart, smile: Smile, video: Video, users: Users, brain: Brain };
export const serviceIconKeys = Object.keys(icons);

type Service = typeof services.$inferSelect;

export function ServiceCard({
  service,
  lang,
  t,
  currency,
  showBook = true,
}: {
  service: Service;
  lang: Lang;
  t: Dictionary;
  currency: string;
  showBook?: boolean;
}) {
  const Icon = icons[service.icon] ?? User;
  const mode = service.mode === "both" ? t.common.both : service.mode === "online" ? t.common.online : t.common.clinic;
  return (
    <Card className="group flex flex-col transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-200/40">
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
        <Icon className="size-6" />
      </span>
      <h3 className="mt-4 text-lg font-bold text-brand-900">{pick(lang, service.titleAr, service.titleEn)}</h3>
      <p className="mt-2 flex-1 text-sm leading-7 text-ink-soft">{pick(lang, service.descriptionAr, service.descriptionEn)}</p>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
        <span className="inline-flex items-center gap-1.5"><Clock className="size-4" />{service.durationMin} {t.common.minutes}</span>
        {service.price > 0 && <span className="font-bold text-brand-700">{service.price} {currency}</span>}
      </div>
      <p className="mt-1 text-xs text-sage-700">{mode}</p>
      {showBook && (
        <Link href={`/book?service=${service.id}`} className={btn("outline", "sm", "mt-5")}>
          {t.common.bookNow}
        </Link>
      )}
    </Card>
  );
}
