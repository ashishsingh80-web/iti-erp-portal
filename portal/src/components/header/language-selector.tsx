"use client";

import { useRouter } from "next/navigation";
import type { AppLanguage } from "@/lib/i18n";

export function LanguageSelector({ currentLanguage }: { currentLanguage: AppLanguage }) {
  const router = useRouter();

  async function updateLanguage(nextLanguage: string) {
    const response = await fetch("/api/settings/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: nextLanguage })
    });
    if (!response.ok) {
      return;
    }
    document.documentElement.lang = nextLanguage === "hi" ? "hi" : "en";
    window.dispatchEvent(new Event("portal-language-change"));
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {currentLanguage === "hi" ? "भाषा" : "Language"}
      </span>
      <select
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none"
        value={currentLanguage}
        onChange={(event) => updateLanguage(event.target.value)}
      >
        <option value="en">{currentLanguage === "hi" ? "अंग्रेज़ी" : "English"}</option>
        <option value="hi">{currentLanguage === "hi" ? "हिंदी" : "Hindi"}</option>
      </select>
    </div>
  );
}
