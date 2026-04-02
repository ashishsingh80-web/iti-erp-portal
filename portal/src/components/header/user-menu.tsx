"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AuthUser } from "@/lib/auth";
import { LogoutButton } from "@/components/auth/logout-button";
import { Select } from "@/components/ui/select";
import type { AppLanguage } from "@/lib/i18n";
import { t } from "@/lib/i18n";

type SessionConfig = {
  activeOneYearSession: string;
  activeTwoYearSession: string;
};

export function UserMenu({
  lang,
  user,
  sessionConfig
}: {
  lang: AppLanguage;
  user: AuthUser;
  sessionConfig: SessionConfig;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 96, left: 0 });
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedDashboardSession = searchParams.get("session") || "ALL_ACTIVE";
  const sessionOptions = useMemo(
    () => [
      { label: t(lang, "All Active Sessions"), value: "ALL_ACTIVE" },
      { label: `1-Year: ${sessionConfig.activeOneYearSession}`, value: sessionConfig.activeOneYearSession },
      { label: `2-Year: ${sessionConfig.activeTwoYearSession}`, value: sessionConfig.activeTwoYearSession }
    ],
    [lang, sessionConfig]
  );

  function switchSession(nextSession: string) {
    const params = new URLSearchParams();
    if (nextSession === "ALL_ACTIVE") {
      params.delete("session");
    } else {
      params.set("session", nextSession);
    }
    const nextHref = params.toString() ? `/?${params.toString()}` : "/";
    router.replace(nextHref as never);
    router.refresh();
    setOpen(false);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function updateMenuPosition() {
      if (!buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const width = Math.min(300, window.innerWidth - 32);
      const left = Math.min(
        Math.max(16, rect.right - width),
        window.innerWidth - width - 16
      );

      setMenuPosition({
        top: rect.bottom + 12,
        left
      });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      if (!containerRef.current && !menuRef.current) return;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="relative max-w-full overflow-visible" ref={containerRef}>
      <button
        ref={buttonRef}
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-300"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-500 text-sm font-bold text-white">
          {user.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={user.name} className="h-full w-full object-cover" src={user.photoUrl} />
          ) : (
            user.name.slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-slate-900">{user.name}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{user.role.replaceAll("_", " ")}</p>
        </div>
      </button>

      {open && mounted
        ? createPortal(
            <>
              <button
                aria-label="Close profile menu overlay"
                className="fixed inset-0 z-[190] bg-transparent"
                onClick={() => setOpen(false)}
                type="button"
              />
              <div
                className="fixed z-[200] w-[300px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-2xl"
                ref={menuRef}
                style={{ left: `${menuPosition.left}px`, top: `${menuPosition.top}px` }}
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t(lang, "User Profile")}</p>
                  <p className="mt-2 truncate text-base font-semibold text-slate-900">{user.email}</p>
                </div>

                <div className="mt-4">
                  <Select
                    label={t(lang, "Dashboard Session")}
                    helperText={t(lang, "This changes the dashboard view.")}
                    options={sessionOptions}
                    value={selectedDashboardSession}
                    onChange={(event) => switchSession(event.target.value)}
                  />
                </div>

                <div className="mt-4 grid gap-2">
                  <a className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700" href="/profile">
                    {t(lang, "Open Profile")}
                  </a>
                  <a
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold ${pathname === "/" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}
                    href={selectedDashboardSession === "ALL_ACTIVE" ? "/" : `/?session=${encodeURIComponent(selectedDashboardSession)}`}
                  >
                    {t(lang, "Open Dashboard")}
                  </a>
                  <a className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700" href="/modules/settings">
                    {t(lang, "Open Masters & Admin")}
                  </a>
                  <LogoutButton className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700" label={t(lang, "Logout")} />
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </div>
  );
}
