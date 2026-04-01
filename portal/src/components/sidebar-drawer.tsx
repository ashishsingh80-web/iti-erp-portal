"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { AuthUser } from "@/lib/auth";
import type { AppLanguage } from "@/lib/i18n";
import { Sidebar } from "@/components/sidebar";

export function SidebarDrawer({
  user,
  lang,
  badges
}: {
  user: AuthUser;
  lang: AppLanguage;
  badges: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        aria-label="Open navigation menu"
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm md:hidden"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span className="text-base leading-none">☰</span>
        Menu
      </button>

      {open ? (
        <div className="fixed inset-0 z-[120] flex md:hidden">
          <button
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-950/55"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div className="relative flex h-[100dvh] max-h-[100dvh] w-[min(92vw,360px)] flex-col border-r border-white/10 bg-slate-950 shadow-2xl">
            <div className="flex shrink-0 justify-end p-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
              <button
                className="rounded-xl border border-white/30 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-white"
                onClick={() => setOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
              <Sidebar badges={badges} lang={lang} user={user} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
