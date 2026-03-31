import { cookies } from "next/headers";
import { type AppLanguage, APP_LANGUAGE_COOKIE, resolveAppLanguage } from "@/lib/i18n";

export async function readAppLanguage(): Promise<AppLanguage> {
  const store = await cookies();
  return resolveAppLanguage(store.get(APP_LANGUAGE_COOKIE)?.value);
}
