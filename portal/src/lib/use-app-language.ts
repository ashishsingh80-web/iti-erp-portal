"use client";

import { useContext, useEffect } from "react";
import { AppLanguageContext } from "@/components/providers/app-language-provider";
import type { AppLanguage } from "@/lib/i18n";
import { resolveAppLanguage } from "@/lib/i18n";

export function useAppLanguage(): AppLanguage {
  const fromContext = useContext(AppLanguageContext);

  useEffect(() => {
    const sync = () => {
      const match = document.cookie.match(/(?:^|; )portal_lang=([^;]*)/);
      const raw = match ? decodeURIComponent(match[1].trim()) : "";
      const next = resolveAppLanguage(raw || document.documentElement.getAttribute("lang"));
      document.documentElement.lang = next === "hi" ? "hi" : "en";
    };
    window.addEventListener("portal-language-change", sync);
    return () => window.removeEventListener("portal-language-change", sync);
  }, []);

  return fromContext;
}
