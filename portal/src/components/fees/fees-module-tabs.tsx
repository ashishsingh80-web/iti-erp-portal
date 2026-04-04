import Link from "next/link";
import type { Route } from "next";
import type { AppLanguage } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export type FeesModuleTabId = "collect" | "ledger" | "outstanding";

export function FeesModuleTabs({ lang, active }: { lang: AppLanguage; active: FeesModuleTabId }) {
  const tabs: { id: FeesModuleTabId; label: string; href: Route }[] = [
    { id: "collect", label: t(lang, "Fee collection"), href: "/modules/fees?tab=collect" as Route },
    { id: "ledger", label: t(lang, "Agent ledger"), href: "/modules/fees?tab=ledger" as Route },
    { id: "outstanding", label: t(lang, "Agent outstanding"), href: "/modules/fees?tab=outstanding" as Route }
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
