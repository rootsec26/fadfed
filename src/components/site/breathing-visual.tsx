"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

/**
 * Lazy, guarded mount for the WebGL breathing scene.
 * - three.js chunk only downloads when the section nears the viewport
 * - prefers-reduced-motion / no-WebGL → pure CSS gradient fallback
 * - canvas is pointer-events-none + aria-hidden (purely decorative)
 */

const Scene = dynamic(() => import("./breathing-scene").then((m) => m.BreathingScene), {
  ssr: false,
  loading: () => null,
});

type BreathPhase = "inhale" | "exhale";

function supportsWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Static CSS version of the same composition — soft blurred brand circles. */
function BreathFallback() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Central breathing blob */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="size-56 animate-breath rounded-full bg-gradient-to-br from-brand-300/70 via-brand-200/60 to-sage-200/50 blur-2xl sm:size-72" />
      </div>
      {/* Pebbles */}
      <div className="absolute left-[12%] top-[22%] size-10 animate-float rounded-full bg-sage-200/60 blur-xl" />
      <div className="absolute right-[14%] top-[30%] size-14 animate-float rounded-full bg-accent-soft/70 blur-xl [animation-delay:-3s]" />
      <div className="absolute bottom-[18%] left-[24%] size-8 animate-float rounded-full bg-brand-200/60 blur-lg [animation-delay:-5s]" />
      <div className="absolute bottom-[24%] right-[22%] size-10 animate-float rounded-full bg-sand-200/80 blur-lg [animation-delay:-2s]" />
      {/* Edge fade into the cream background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,var(--color-sand-50)_100%)]" />
    </div>
  );
}

export function BreathingVisual({
  inhaleLabel,
  exhaleLabel,
  captionAriaLabel,
}: {
  inhaleLabel: string;
  exhaleLabel: string;
  captionAriaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [reduced, setReduced] = useState(false);
  const [phase, setPhase] = useState<BreathPhase>("inhale");

  // Mount 3D only when near the viewport (and unmount when far away).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    // Defer capability checks one frame — keeps SSR/hydration identical
    // (fallback first) and satisfies the no-sync-setState-in-effect rule.
    const raf = requestAnimationFrame(() => {
      setWebgl(supportsWebGL());
      setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    });
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => {
      cancelAnimationFrame(raf);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  const showScene = near && webgl === true && !reduced;
  const label = phase === "inhale" ? inhaleLabel : exhaleLabel;

  return (
    <div ref={ref} className="relative mx-auto h-[280px] w-full max-w-2xl sm:h-[360px]">
      {showScene ? (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Edge fade so the canvas melts into the cream background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,var(--color-sand-50)_95%)]" />
          <Scene onPhase={setPhase} />
        </div>
      ) : (
        <BreathFallback />
      )}

      {/* Synced breath caption — flips only twice per cycle */}
      <p
        key={label}
        aria-label={captionAriaLabel}
        className="pointer-events-none absolute inset-x-0 bottom-0 animate-fade-in text-center text-sm font-bold tracking-wide text-brand-600"
      >
        {label}
      </p>
    </div>
  );
}
