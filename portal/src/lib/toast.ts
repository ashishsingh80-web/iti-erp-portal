"use client";

export type ToastPayload = {
  kind?: "success" | "error" | "info";
  title: string;
  message?: string;
  durationMs?: number;
};

export function showToast(payload: ToastPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("portal-toast", { detail: payload }));
}
