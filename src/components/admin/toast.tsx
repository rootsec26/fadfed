"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Alert } from "@/components/ui";

type Toast = { id: number; message: string; tone: "success" | "error" | "info" };

const ToastCtx = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

/** Minimal toast system for admin pages (no external deps). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 inset-x-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:end-6 sm:items-end">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full max-w-sm animate-fade-in">
            <Alert tone={t.tone === "error" ? "error" : t.tone === "info" ? "info" : "success"}>{t.message}</Alert>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
