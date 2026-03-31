"use client";

import { useEffect, useState } from "react";
import type { AppLanguage } from "@/lib/i18n";
import { resolveAppLanguage } from "@/lib/i18n";

export function useAppLanguage() {
  const [lang, setLang] = useState<AppLanguage>("en");

  useEffect(() => {
    const syncLanguage = () => setLang(resolveAppLanguage(document.documentElement.lang));
    syncLanguage();
    window.addEventListener("portal-language-change", syncLanguage);
    return () => window.removeEventListener("portal-language-change", syncLanguage);
  }, []);

  return lang;
}
