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
        <div className="fixed inset-0 z-[120] md:hidden">
          <button
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-950/55"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div className="absolute inset-y-0 left-0 w-[min(92vw,360px)] overflow-y-auto p-3">
            <div className="mb-3 flex justify-end">
              <button
                className="rounded-xl border border-white/30 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-white"
                onClick={() => setOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>
            <Sidebar badges={badges} lang={lang} user={user} />
          </div>
        </div>
      ) : null}
    </>
  );
}
