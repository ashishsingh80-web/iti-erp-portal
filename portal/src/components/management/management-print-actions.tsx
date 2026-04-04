"use client";

import { t } from "@/lib/i18n";
import { useAppLanguage } from "@/lib/use-app-language";

export function ManagementPrintActions() {
  const lang = useAppLanguage();
  return (
    <button
      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      onClick={() => window.print()}
      type="button"
    >
      {t(lang, "Print summary")}
    </button>
  );
}
