"use client";

import { useEffect, useState } from "react";
import type { ToastPayload } from "@/lib/toast";

type ToastItem = Required<ToastPayload> & { id: string };

const DEFAULT_DURATION_MS = 3600;

function toastMeta(kind: ToastItem["kind"]) {
  if (kind === "error") {
    return {
      icon: "!",
      shellClass: "border-rose-200 bg-rose-50 text-rose-700",
      iconClass: "bg-rose-100 text-rose-700",
      progressClass: "bg-rose-400"
    };
  }

  if (kind === "success") {
    return {
      icon: "OK",
      shellClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      iconClass: "bg-emerald-100 text-emerald-700",
      progressClass: "bg-emerald-400"
    };
  }

  return {
    icon: "i",
    shellClass: "border-sky-200 bg-sky-50 text-sky-700",
    iconClass: "bg-sky-100 text-sky-700",
    progressClass: "bg-sky-400"
  };
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    function onToast(event: Event) {
      const customEvent = event as CustomEvent<ToastPayload>;
      const payload = customEvent.detail;
      if (!payload?.title) return;

      const nextItem: ToastItem = {
        id: crypto.randomUUID(),
        kind: payload.kind || "info",
        title: payload.title,
        message: payload.message || "",
        durationMs: payload.durationMs || DEFAULT_DURATION_MS
      };

      setItems((current) => [...current, nextItem]);

      const timeoutId = window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== nextItem.id));
      }, nextItem.durationMs);

      return () => window.clearTimeout(timeoutId);
    }

    window.addEventListener("portal-toast", onToast as EventListener);
    return () => window.removeEventListener("portal-toast", onToast as EventListener);
  }, []);

  function dismissToast(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-3">
      {items.map((item) => {
        const meta = toastMeta(item.kind);

        return (
          <div
            key={item.id}
            className={`pointer-events-auto relative overflow-hidden rounded-3xl border px-4 py-4 shadow-xl transition-transform duration-200 hover:-translate-y-0.5 ${meta.shellClass} portal-toast-enter`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-bold uppercase tracking-[0.18em] ${meta.iconClass}`}>
                {meta.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.message ? <p className="mt-1 text-sm leading-5 opacity-90">{item.message}</p> : null}
              </div>
              <button
                className="rounded-full px-2 py-1 text-xs font-semibold opacity-70 transition hover:bg-black/5 hover:opacity-100"
                onClick={() => dismissToast(item.id)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/5">
              <div
                className={`h-full rounded-full portal-toast-progress ${meta.progressClass}`}
                style={{ animationDuration: `${item.durationMs}ms` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
