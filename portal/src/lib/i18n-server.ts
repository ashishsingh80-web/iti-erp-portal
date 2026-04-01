import { cookies } from "next/headers";
import { cache } from "react";
import { type AppLanguage, APP_LANGUAGE_COOKIE, resolveAppLanguage } from "@/lib/i18n";

async function loadAppLanguage(): Promise<AppLanguage> {
  const store = await cookies();
  return resolveAppLanguage(store.get(APP_LANGUAGE_COOKIE)?.value);
}

export const readAppLanguage = cache(loadAppLanguage);
