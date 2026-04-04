import Link from "next/link";
import type { Route } from "next";
import type { AppLanguage } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import type { AdmissionDeskFilters } from "@/lib/services/admission-desk-service";

const FILTER_KEYS = [
  "search",
  "instituteCode",
  "tradeValue",
  "session",
  "yearLabel",
  "category",
  "status",
  "assignment",
  "unitNumber",
  "view"
] as const;

export function buildAdmissionsHref(filters: AdmissionDeskFilters, section: string, extra?: Partial<AdmissionDeskFilters>) {
  const p = new URLSearchParams();
  p.set("section", section);
  const merged = { ...filters, ...extra };
  for (const key of FILTER_KEYS) {
    const v = merged[key];
    if (typeof v === "string" && v.trim()) p.set(key, v.trim());
  }
  return `/modules/admissions?${p.toString()}` as Route;
}

export function AdmissionsSectionTabs({
  lang,
  filters,
  active
}: {
  lang: AppLanguage;
  filters: AdmissionDeskFilters;
  active: "overview" | "register" | "form" | "import";
}) {
  const tabs: { id: typeof active; label: string }[] = [
    { id: "overview", label: t(lang, "Overview") },
    { id: "register", label: t(lang, "Register") },
    { id: "form", label: t(lang, "New admission") },
    { id: "import", label: t(lang, "Bulk import") }
  ];

  return (
    <nav className="surface flex flex-wrap gap-2 border border-slate-100 p-3 shadow-sm">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={buildAdmissionsHref(filters, tab.id)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            active === tab.id ? "bg-emerald-700 text-white shadow" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
