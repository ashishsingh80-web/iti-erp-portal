import { LanguageSelector } from "@/components/header/language-selector";
import { UserMenu } from "@/components/header/user-menu";
import type { AuthUser } from "@/lib/auth";
import type { AppLanguage } from "@/lib/i18n";

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
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-slate-950">
          Adarsh Rashtriya Private ITI
          <span className="block text-slate-700">&amp; Babu Harbansh Bahadur Singh Private ITI</span>
        </h2>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <LanguageSelector currentLanguage={lang} />
        <UserMenu lang={lang} sessionConfig={sessionConfig} user={user} />
      </div>
    </header>
  );
}
