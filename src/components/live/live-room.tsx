"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { joinLiveSession } from "@/actions/live-sessions";
import { Alert, Button, Card, Checkbox } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";

type T = Dictionary["live"];
type Phase = "check" | "ready" | "joining" | "call" | "manual" | "ended" | "error";

/** Minimal shape of the daily-js call object we use (loaded dynamically). */
type DailyCall = {
  on: (event: string, cb: () => void) => void;
  join: (opts: { url: string; token: string }) => Promise<unknown>;
  destroy?: () => void;
};

const mediaSupported = () =>
  typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

/**
 * Pre-join screen (camera/mic check + patient consent) then embeds Daily
 * Prebuilt. daily-js is imported dynamically so SSR never touches window.
 * Falls back to the doctor's manual link when Daily is unavailable.
 */
export function LiveRoom({
  sessionId,
  isPatient,
  needsConsent,
  t,
  emergency,
}: {
  sessionId: string;
  isPatient: boolean;
  needsConsent: boolean;
  t: T;
  emergency: { title: string; text: string; hotline: string };
}) {
  // Always start at "check" on server AND client — branching on browser
  // capabilities here caused a hydration mismatch (the "1 Issue" overlay).
  const [phase, setPhase] = useState<Phase>("check");
  const [consent, setConsent] = useState(false);
  const [camOk, setCamOk] = useState<boolean | null>(null);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const callRef = useRef<DailyCall | null>(null);
  // True only after Daily confirms we actually entered the meeting — a
  // left-meeting before that means the join FAILED, not that it ended.
  const joinedRef = useRef(false);

  const stopPreview = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  const checkMedia = useCallback(async () => {
    if (!mediaSupported()) {
      setCamOk(false);
      setMicOk(false);
      setPhase("ready"); // join will surface the unsupported/error state
      return;
    }
    setCamOk(null);
    setMicOk(null);
    stopPreview();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      // The <video> element is always mounted, so the ref is ready here.
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => {});
      }
      setCamOk(true);
      setMicOk(true);
      setPhase("ready");
    } catch {
      // Camera may be denied while mic works — try audio only.
      try {
        const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = audio;
        setCamOk(false);
        setMicOk(true);
        setPhase("ready");
      } catch {
        setCamOk(false);
        setMicOk(false);
        setPhase("ready");
      }
    }
  }, [stopPreview]);

  useEffect(() => {
    // Deferred so the media check doesn't setState synchronously in the effect.
    const id = setTimeout(() => void checkMedia(), 0);
    return () => {
      clearTimeout(id);
      stopPreview();
      callRef.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const join = async () => {
    setPhase("joining");
    stopPreview();
    const res = await joinLiveSession(sessionId);
    if (!res.ok) {
      setPhase("error");
      return;
    }
    if (res.mode === "manual") {
      setManualUrl(res.url);
      setPhase("manual");
      return;
    }
    try {
      joinedRef.current = false;
      const { default: Daily } = await import("@daily-co/daily-js");
      // Container is always mounted (hidden until the call starts).
      const call = Daily.createFrame(containerRef.current as HTMLElement, {
        iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "16px" },
      }) as unknown as DailyCall;
      callRef.current = call;
      call.on("joined-meeting", () => {
        joinedRef.current = true;
      });
      call.on("left-meeting", () => setPhase(joinedRef.current ? "ended" : "error"));
      call.on("camera-error", () => setPhase("error"));
      call.on("error", () => setPhase("error"));
      await call.join({ url: res.url, token: res.token });
      setPhase("call");
    } catch {
      setPhase("error");
    }
  };

  const joining = phase === "joining";
  const checking = phase === "check" || joining;
  // Mic is required; camera is nice-to-have (denied cam still lets them join).
  const canJoin = phase === "ready" && micOk === true && (!isPatient || !needsConsent || consent);
  const inCall = phase === "call";

  return (
    <div className="space-y-4">
      {/* Daily Prebuilt iframe — always mounted so createFrame() can attach before join(). */}
      <div
        ref={containerRef}
        className={inCall ? "h-[70vh] w-full overflow-hidden rounded-3xl border border-sand-200 bg-black" : "hidden"}
      />

      {inCall ? null : phase === "ended" ? (
        <Card className="space-y-3 text-center">
          <h2 className="text-xl font-extrabold text-brand-900">{t.endedTitle}</h2>
          <p className="text-sm text-ink-soft">{t.endedText}</p>
        </Card>
      ) : phase === "manual" ? (
        <Card className="space-y-4 text-center">
          <h2 className="text-xl font-extrabold text-brand-900">{t.title}</h2>
          <p className="text-sm text-ink-soft">{t.prejoinText}</p>
          <a href={manualUrl} target="_blank" rel="noreferrer" className="inline-flex">
            <Button>{t.manualLink}</Button>
          </a>
        </Card>
      ) : (
        <Card className="space-y-5">
          <div>
            <h2 className="text-xl font-extrabold text-brand-900">{t.prejoinTitle}</h2>
            <p className="mt-1 text-sm text-ink-soft">{t.prejoinText}</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-brand-900">
            {/* Always mounted so the stream attaches as soon as getUserMedia resolves. */}
            <video ref={videoRef} autoPlay playsInline muted className={`h-56 w-full -scale-x-100 object-cover ${checking ? "invisible" : ""}`} />
            {checking && (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/70">{t.checking}</div>
            )}
            <div className="absolute bottom-3 start-3 flex flex-wrap gap-2 text-xs font-semibold">
              {camOk === true && <span className="rounded-full bg-sage-600/90 px-3 py-1 text-white">{t.cameraOk}</span>}
              {camOk === false && <span className="rounded-full bg-amber-500/90 px-3 py-1 text-white">{t.cameraFail}</span>}
              {micOk === true && <span className="rounded-full bg-sage-600/90 px-3 py-1 text-white">{t.micOk}</span>}
              {micOk === false && <span className="rounded-full bg-amber-500/90 px-3 py-1 text-white">{t.micFail}</span>}
            </div>
          </div>

          {camOk === false && micOk === false && phase === "ready" && (
            <Alert tone="warning">{t.cameraFail} {t.micFail}</Alert>
          )}

          {isPatient && needsConsent && (
            <div className="space-y-2">
              <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)}>
                {t.consent}
              </Checkbox>
              <p className="rounded-2xl bg-rose-50 px-4 py-2.5 text-xs leading-relaxed text-rose-800">
                <strong>{emergency.title}</strong> {emergency.text} {emergency.hotline}
              </p>
            </div>
          )}

          <p className="text-xs text-ink-soft">{t.waitingNote}</p>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void join()} disabled={!canJoin || joining}>
              {joining ? t.joining : t.joinBtn}
            </Button>
            {(phase === "ready" || phase === "error") && (
              <Button variant="outline" size="sm" onClick={() => void checkMedia()}>
                {t.retry}
              </Button>
            )}
            {phase === "error" && <span className="text-sm text-rose-600">{t.error}</span>}
          </div>
        </Card>
      )}
    </div>
  );
}
