"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";
import type { AppLanguage } from "@/lib/i18n";

export const AppLanguageContext = createContext<AppLanguage>("en");

export function AppLanguageProvider({
  initialLang,
  children
}: {
  initialLang: AppLanguage;
  children: ReactNode;
}) {
  const [lang, setLang] = useState<AppLanguage>(initialLang);

  useEffect(() => {
    setLang(initialLang);
    if (typeof document !== "undefined") {
      document.documentElement.lang = initialLang === "hi" ? "hi" : "en";
    }
  }, [initialLang]);

  return <AppLanguageContext.Provider value={lang}>{children}</AppLanguageContext.Provider>;
}
