import type { ReactNode } from "react";
import { cn } from "@/components/ui";
import { TikTok, WhatsApp } from "./social-icons";

type SocialHoverIconProps = {
  href?: string;
  label: string; // accessible name / tooltip text (Arabic)
  hoverClass: string; // brand hover background, e.g. "group-hover:bg-[#25D366]"
  icon: (p: { className?: string }) => ReactNode;
};

function SocialHoverIcon({ href, label, hoverClass, icon: Icon }: SocialHoverIconProps) {
  const className = cn(
    "group relative grid size-11 place-items-center rounded-full bg-gray-100 text-brand-700 shadow-md transition-all duration-300 ease-in-out hover:scale-110",
    hoverClass,
    "hover:text-white",
  );
  const body = (
    <>
      <Icon className="size-5 transition-colors duration-300" />
      {/* Tooltip below the icon, appears on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-full mt-2 translate-y-1 rounded-md bg-ink px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 transition-all duration-300 ease-in-out group-hover:translate-y-0 group-hover:opacity-100"
      >
        {label}
      </span>
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={className}>
      {body}
    </a>
  ) : (
    <span aria-label={label} role="img" className={className}>
      {body}
    </span>
  );
}

/** WhatsApp + TikTok circular icons with brand-color hover and Arabic tooltips. RTL-safe. */
export function SocialHoverIcons({
  whatsappHref,
  tiktokHref,
}: {
  whatsappHref?: string;
  tiktokHref?: string;
}) {
  return (
    <div className="flex items-center gap-4" dir="ltr">
      <SocialHoverIcon
        href={whatsappHref}
        label="واتساب"
        hoverClass="hover:bg-[#25D366]"
        icon={WhatsApp}
      />
      <SocialHoverIcon
        href={tiktokHref}
        label="تيك توك"
        hoverClass="hover:bg-[#000000]"
        icon={TikTok}
      />
    </div>
  );
}
