"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/auth";
import { getUserAllowedModules } from "@/lib/access";
import type { AppLanguage } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { portalModules, portalNavigationGroups } from "@/lib/module-config";

const roleDefaultPins: Record<AuthUser["role"], string[]> = {
  SUPER_ADMIN: ["management", "reports", "settings", "accounts", "admissions", "students"],
  ADMIN: ["management", "reports", "settings", "accounts", "admissions", "students"],
  ADMISSION_STAFF: ["admissions", "enquiry", "students", "attendance", "documents", "reports"],
  DOCUMENT_VERIFIER: ["documents", "students", "undertaking", "certificates", "reports", "no-dues"],
  SCHOLARSHIP_DESK: ["scholarship", "students", "documents", "reports", "communication", "management"],
  FINANCE_DESK: ["fees", "accounts", "students", "agents", "hr", "management"],
  PRN_SCVT_DESK: ["scvt", "prn", "students", "exam-status", "reports", "management"],
  VIEWER: ["dashboard", "students", "reports", "management", "attendance", "certificates"]
};

export function Sidebar({
  user,
  lang,
  badges,
  className
}: {
  user: AuthUser;
  lang: AppLanguage;
  badges: Record<string, string>;
  className?: string;
}) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [pinnedSlugs, setPinnedSlugs] = useState<string[]>([]);
  const modules = getUserAllowedModules(user, portalModules);
  const liveModuleBySlug = useMemo(() => new Map(modules.map((module) => [module.slug, module])), [modules]);
  const normalizedSearch = search.trim().toLowerCase();
  const groupedModules = useMemo(
    () =>
      portalNavigationGroups
        .map((group) => ({
          ...group,
          modules: group.slugs
            .map((slug) => liveModuleBySlug.get(slug))
            .filter((module): module is (typeof modules)[number] => Boolean(module))
            .filter((module) => {
              if (!normalizedSearch) return true;
              const haystack = `${module.title} ${module.shortTitle} ${module.description} ${module.highlights.join(" ")}`.toLowerCase();
              return haystack.includes(normalizedSearch);
            })
        }))
        .filter((group) => group.modules.length),
    [liveModuleBySlug, modules, normalizedSearch]
  );

  const groupMeta: Record<
    string,
    {
      badge: string;
      open?: boolean;
    }
  > = {
    Dashboard: { badge: "DB", open: true },
    "Admission Management": { badge: "AM", open: true },
    "Student Management": { badge: "SM", open: true },
    "Agent Management": { badge: "AG", open: true },
    "Scholarship Management": { badge: "SC" },
    "Fees Management": { badge: "FE" },
    "Attendance Management": { badge: "AT" },
    "Academic Management": { badge: "AC" },
    "Examination Management": { badge: "EX" },
    "Certificate & Document Management": { badge: "CD" },
    "Employee / HR Management": { badge: "HR" },
    "Inventory / Store Management": { badge: "IS" },
    Accounting: { badge: "FN" },
    "Communication Module": { badge: "CM" },
    "Reports & Analytics": { badge: "RA", open: true },
    "Master Setup": { badge: "MS" },
    "Legal & Compliance": { badge: "LC" }
  };

  const moduleBadge: Record<string, string> = {
    admissions: "AD",
    enquiry: "EN",
    students: "ST",
    promote: "PR",
    alumni: "AL",
    "student-archive": "AR",
    attendance: "AT",
    documents: "DO",
    scholarship: "SC",
    scvt: "SV",
    prn: "PN",
    undertaking: "UN",
    "exam-status": "EX",
    "no-dues": "ND",
    certificates: "CE",
    timetable: "TT",
    inventory: "IN",
    library: "LB",
    placement: "PL",
    fees: "FE",
    accounts: "AC",
    agents: "AG",
    hr: "HR",
    reports: "RP",
    management: "MG",
    communication: "CM",
    grievance: "GR",
    backup: "BK",
    settings: "MS"
  };
  const queueBadgeMap: Record<string, string> = {
    enquiry: badges["Follow-Ups Due"] || badges["New Enquiries"] || "",
    documents: badges["Docs Pending"] || "",
    fees: badges["Fee Due Cases"] || "",
    scholarship: badges["Scholarship Queries"] || "",
    scvt: badges["SCVT Pending"] || "",
    prn: badges["PRN Pending"] || "",
    admissions: badges["Pending Admissions"] || "",
    management: badges["Total Students"] || ""
  };
  const queueBadgeTone: Record<string, string> = {
    enquiry: "bg-cyan-500/15 text-cyan-200",
    documents: "bg-amber-500/15 text-amber-200",
    fees: "bg-rose-500/15 text-rose-200",
    scholarship: "bg-violet-500/15 text-violet-200",
    scvt: "bg-blue-500/15 text-blue-200",
    prn: "bg-teal-500/15 text-teal-200",
    admissions: "bg-orange-500/15 text-orange-200",
    management: "bg-emerald-500/15 text-emerald-200"
  };

  const currentSlug =
    pathname === "/"
      ? "dashboard"
      : pathname.startsWith("/modules/")
        ? pathname.replace("/modules/", "").split("/")[0]
        : "";
  const pinnedModules = pinnedSlugs
    .map((slug) => liveModuleBySlug.get(slug))
    .filter((module): module is (typeof modules)[number] => Boolean(module));

  function samePins(left: string[], right: string[]) {
    if (left.length !== right.length) return false;
    return left.every((item, index) => item === right[index]);
  }

  useEffect(() => {
    const storageKey = `iti-erp-sidebar-pins:${user.id}`;
    const defaultPins = (roleDefaultPins[user.role] || []).filter((slug) => liveModuleBySlug.has(slug)).slice(0, 6);
    try {
      const saved = window.localStorage.getItem(storageKey);
      let nextPins = defaultPins;
      if (!saved) {
        setPinnedSlugs((current) => (samePins(current, nextPins) ? current : nextPins));
        return;
      }
      const parsed = JSON.parse(saved) as string[];
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((slug) => liveModuleBySlug.has(slug)).slice(0, 6);
        nextPins = filtered.length ? filtered : defaultPins;
      }
      setPinnedSlugs((current) => (samePins(current, nextPins) ? current : nextPins));
    } catch {
      setPinnedSlugs((current) => (samePins(current, defaultPins) ? current : defaultPins));
    }
  }, [liveModuleBySlug, user.id, user.role]);

  useEffect(() => {
    const storageKey = `iti-erp-sidebar-pins:${user.id}`;
    window.localStorage.setItem(storageKey, JSON.stringify(pinnedSlugs));
  }, [pinnedSlugs, user.id]);

  function togglePin(slug: string) {
    setPinnedSlugs((current) => {
      if (current.includes(slug)) {
        return current.filter((item) => item !== slug);
      }
      return [slug, ...current].slice(0, 6);
    });
  }

  function resetPinsToRoleDefault() {
    setPinnedSlugs((roleDefaultPins[user.role] || []).filter((slug) => liveModuleBySlug.has(slug)).slice(0, 6));
  }

  return (
    <aside
      className={`relative z-20 block min-h-0 w-full shrink-0 overflow-x-hidden overflow-y-auto overscroll-contain rounded-[2rem] border border-white/60 bg-slate-950 px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] text-white shadow-2xl print:hidden md:sticky md:top-6 md:h-[calc(100vh-3rem)] md:max-h-[calc(100vh-3rem)] md:w-[320px] md:max-w-[320px] md:self-start ${className || ""}`}
    >
      <div className="rounded-[1.75rem] bg-white/5 p-4">
        <div className="flex flex-col items-center text-center">
          <div className="shrink-0 leading-none">
            <Image
              alt="ITI logo"
              className="object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.22)]"
              height={150}
              priority
              src="/portal-logo.png"
              width={150}
            />
          </div>
          <h1 className="mt-0 text-xl font-semibold leading-7 text-white">Adarsh Rashtriya Private ITI &amp; Babu Harbansh Bahadur Singh Private ITI</h1>
          <p className="mt-1 max-w-[220px] text-sm leading-6 text-white/65">{t(lang, "Skilled manpower operations portal")}</p>
        </div>
      </div>

      <nav className="mt-6 space-y-5">
        <Link
          className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition ${
            currentSlug === "dashboard"
              ? "bg-emerald-600 shadow-emerald-950/30 ring-1 ring-emerald-300/20"
              : "bg-emerald-700 shadow-emerald-950/20 hover:bg-emerald-600"
          }`}
          href="/"
        >
          {t(lang, "Dashboard")}
          <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] uppercase tracking-[0.16em]">
            {currentSlug === "dashboard" ? t(lang, "Open") : t(lang, "Live")}
          </span>
        </Link>

        <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-3">
          <label className="block">
            <span className="px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">
              {t(lang, "Find Module")}
            </span>
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400/30 focus:outline-none"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t(lang, "Search admissions, fees, HR...")}
              value={search}
            />
          </label>
          {normalizedSearch ? (
            <div className="mt-2 flex items-center justify-between px-1 text-[11px] uppercase tracking-[0.18em] text-white/40">
              <span>{groupedModules.reduce((sum, group) => sum + group.modules.length, 0)} {t(lang, "results")}</span>
              <button
                className="rounded-full bg-white/8 px-2 py-1 text-[10px] font-semibold text-white/70 transition hover:bg-white/12"
                onClick={() => setSearch("")}
                type="button"
              >
                {t(lang, "Clear")}
              </button>
            </div>
          ) : null}
        </div>

        {pinnedModules.length ? (
          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-3 px-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">
                {t(lang, "Pinned Modules")}
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                {pinnedModules.length}/6
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                  {t(lang, "Role Default")}
                </span>
                <button
                  className="rounded-full bg-white/8 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 transition hover:bg-white/12"
                  onClick={resetPinsToRoleDefault}
                  type="button"
                >
                  {t(lang, "Reset")}
                </button>
              </div>
              {pinnedModules.map((module) => {
                const href = module.slug === "dashboard" ? "/" : `/modules/${module.slug}`;
                const moduleIsActive = module.slug === currentSlug;
                return (
                  <div
                    key={`pin-${module.slug}`}
                    className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${
                      moduleIsActive ? "bg-emerald-500/12 ring-1 ring-emerald-400/20" : "bg-white/5"
                    }`}
                  >
                    <a className="flex min-w-0 flex-1 items-center gap-3 text-sm font-medium text-white/85" href={href}>
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-[10px] uppercase tracking-[0.14em] text-white/60">
                        {moduleBadge[module.slug] || "ER"}
                      </span>
                      <span className="truncate">{t(lang, module.shortTitle)}</span>
                    </a>
                    <div className="flex items-center gap-2">
                      {queueBadgeMap[module.slug] ? (
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                            queueBadgeTone[module.slug] || "bg-emerald-500/15 text-emerald-200"
                          }`}
                        >
                          {queueBadgeMap[module.slug]}
                        </span>
                      ) : null}
                      <button
                        className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200 transition hover:bg-amber-500/25"
                        onClick={() => togglePin(module.slug)}
                        type="button"
                      >
                        {t(lang, "Pinned")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {groupedModules.map((group) => {
          const meta = groupMeta[group.title] || { badge: "ER" };
          const groupIsActive = group.modules.some((module) => module.slug === currentSlug);
          return (
            <details
              key={`${group.key}-${group.title}`}
              className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-2"
              open={groupIsActive || meta.open}
            >
              <summary
                className={`flex cursor-pointer list-none items-center justify-between rounded-2xl px-3 py-2 text-sm font-semibold transition hover:bg-white/6 ${
                  groupIsActive ? "bg-white/8 text-white" : "text-white/90"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[11px] uppercase tracking-[0.16em] ${
                      groupIsActive ? "bg-emerald-500/20 text-emerald-200" : "bg-white/8 text-white/70"
                    }`}
                  >
                    {meta.badge}
                  </span>
                  <span>{t(lang, group.title)}</span>
                </span>
                <span className={`text-[10px] uppercase tracking-[0.18em] ${groupIsActive ? "text-emerald-200/80" : "text-white/35"}`}>
                  {group.modules.length}
                </span>
              </summary>
              <div className="mt-2 space-y-1">
                {group.modules.map((module) => {
                  const href = module.slug === "dashboard" ? "/" : `/modules/${module.slug}`;
                  const moduleIsActive = module.slug === currentSlug;
                  return (
                    <a
                      key={`${group.title}-${module.slug}`}
                      className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                        moduleIsActive
                          ? "bg-emerald-500/12 text-white ring-1 ring-emerald-400/20"
                          : "text-white/80 hover:bg-white/8 hover:text-white"
                      }`}
                      href={href}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] uppercase tracking-[0.14em] ${
                            moduleIsActive ? "bg-emerald-500/20 text-emerald-100" : "bg-white/6 text-white/55"
                          }`}
                        >
                          {moduleBadge[module.slug] || "ER"}
                        </span>
                        <span>{t(lang, module.shortTitle)}</span>
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-[0.16em] ${
                          moduleIsActive ? "text-emerald-100/80" : "text-white/35"
                        }`}
                      >
                        {moduleIsActive
                          ? t(lang, "Open")
                          : queueBadgeMap[module.slug]
                            ? queueBadgeMap[module.slug]
                            : pinnedSlugs.includes(module.slug)
                              ? t(lang, "Pinned")
                              : module.group === "reports"
                                ? t(lang, "MIS")
                                : module.group === "finance"
                                  ? t(lang, "Desk")
                                  : ""}
                      </span>
                    </a>
                  );
                })}
              </div>
              <div className="mt-2 grid gap-1">
                {group.modules.map((module) => (
                  <button
                    key={`${group.title}-${module.slug}-pin`}
                    className={`flex items-center justify-between rounded-2xl px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.16em] transition ${
                      pinnedSlugs.includes(module.slug)
                        ? "bg-amber-500/12 text-amber-100 hover:bg-amber-500/18"
                        : "bg-white/[0.02] text-white/45 hover:bg-white/6 hover:text-white/70"
                    }`}
                    onClick={() => togglePin(module.slug)}
                    type="button"
                  >
                    <span>{t(lang, module.shortTitle)}</span>
                    <span>{pinnedSlugs.includes(module.slug) ? t(lang, "Unpin") : t(lang, "Pin")}</span>
                  </button>
                ))}
              </div>
            </details>
          );
        })}

        {normalizedSearch && !groupedModules.length ? (
          <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/55">
            {t(lang, "No module matched this search.")}
          </div>
        ) : null}
      </nav>

      <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">{t(lang, "Quick Actions")}</p>
        <div className="mt-3 grid gap-2">
          <a className="rounded-2xl bg-white/6 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10" href="/modules/management">
            {t(lang, "Group Dashboard")}
          </a>
          <a className="rounded-2xl bg-white/6 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10" href="/modules/admissions">
            {t(lang, "New Admission")}
          </a>
          <a className="rounded-2xl bg-white/6 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10" href="/modules/reports?report=agent-statement">
            {t(lang, "Agent Reports")}
          </a>
        </div>
      </div>
    </aside>
  );
}
