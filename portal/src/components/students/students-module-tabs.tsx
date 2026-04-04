import Link from "next/link";
import type { Route } from "next";
import type { AppLanguage } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export type StudentsModuleTabId = "directory" | "verification" | "import";

export function StudentsModuleTabs({ lang, active }: { lang: AppLanguage; active: StudentsModuleTabId }) {
  const tabs: { id: StudentsModuleTabId; label: string; href: Route }[] = [
    { id: "directory", label: t(lang, "Directory"), href: "/modules/students?tab=directory" as Route },
    { id: "verification", label: t(lang, "Verification"), href: "/modules/students?tab=verification" as Route },
    { id: "import", label: t(lang, "Historical import"), href: "/modules/students?tab=import" as Route }
  ];

  return (
    <nav className="surface flex flex-wrap gap-2 border border-slate-100 p-3 shadow-sm">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
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
