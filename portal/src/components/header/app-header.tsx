import { LanguageSelector } from "@/components/header/language-selector";
import { UserMenu } from "@/components/header/user-menu";
import type { AuthUser } from "@/lib/auth";
import type { AppLanguage } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function AppHeader({
  lang,
  user,
  sessionConfig
}: {
  lang: AppLanguage;
  user: AuthUser;
  sessionConfig: {
    activeOneYearSession: string;
    activeTwoYearSession: string;
  };
}) {
  return (
    <header className="surface relative z-[90] flex flex-wrap items-center justify-between gap-4 overflow-visible px-6 py-5 print:hidden">
      <div>
        <p className="eyebrow-compact">Adarsh Rashtriya Private ITI • Babu Harbansh Bahadur Singh Private ITI</p>
        <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-950">{t(lang, "Institute Operations Portal")}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <LanguageSelector currentLanguage={lang} />
        <UserMenu lang={lang} sessionConfig={sessionConfig} user={user} />
      </div>
    </header>
  );
}
