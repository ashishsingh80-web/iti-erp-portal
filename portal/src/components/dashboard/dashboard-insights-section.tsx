import Link from "next/link";
import { formatInr } from "@/lib/currency";
import type { AppLanguage } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { getDashboardInsights } from "@/lib/services/dashboard-service";

const emptyInsights = {
  managementCards: [] as Array<{ label: string; value: string; helper: string }>,
  trend: [] as Array<{
    month: string;
    admissions: number;
    enquiries: number;
    conversions: number;
    conversionRate: number;
  }>,
  instituteComparison: [] as Array<{
    institute: string;
    code: string;
    totalStudents: number;
    docsPending: number;
    feeDueCases: number;
  }>,
  tradeDemand: [] as Array<{ trade: string; institute: string; admissions: number; enquiries: number }>,
  sessionFinancials: [] as Array<{
    session: string;
    totalStudents: number;
    collections: number;
    dueAmount: number;
  }>
};

export async function DashboardInsightsSection({
  lang,
  selectedSession
}: {
  lang: AppLanguage;
  selectedSession: string | null;
}) {
  let insights = emptyInsights;
  try {
    insights = await getDashboardInsights(selectedSession);
  } catch {
    insights = emptyInsights;
  }

  return (
    <section className="surface p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow-compact">{t(lang, "Management View")}</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-950">{t(lang, "Monthly Operations Snapshot")}</h3>
        </div>
        <Link className="chip-success" href="/modules/reports">
          {t(lang, "Open Reports")}
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {insights.managementCards.map((card) => (
          <article key={card.label} className="rounded-3xl border border-slate-100 bg-white px-5 py-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{t(lang, card.label)}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</p>
            <p className="mt-2 text-sm text-slate-600">{t(lang, card.helper)}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {insights.trend.map((item) => (
          <article key={item.month} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{item.month}</p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">{t(lang, "Admissions")}</span>
                <span className="font-semibold text-slate-900">{item.admissions}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">{t(lang, "Enquiries")}</span>
                <span className="font-semibold text-slate-900">{item.enquiries}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">{t(lang, "Conversions")}</span>
                <span className="font-semibold text-emerald-800">{item.conversions}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                <span className="text-slate-700">{t(lang, "Conversion Rate")}</span>
                <span className="font-semibold text-slate-900">{item.conversionRate}%</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <article className="rounded-3xl border border-slate-100 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-compact">{t(lang, "Institute Comparison")}</p>
              <h4 className="mt-2 text-lg font-semibold text-slate-950">{t(lang, "Current Working Load")}</h4>
            </div>
            <span className="chip-neutral">{insights.instituteComparison.length}</span>
          </div>
          <div className="mt-4 space-y-3">
            {insights.instituteComparison.map((item) => (
              <div key={item.code || item.institute} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{item.code || item.institute}</p>
                  <p className="text-sm font-semibold text-slate-600">{item.totalStudents}</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">{item.institute}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <span>
                    {t(lang, "Docs")}: {item.docsPending}
                  </span>
                  <span>
                    {t(lang, "Fees Due")}: {item.feeDueCases}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-100 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-compact">{t(lang, "Trade Demand")}</p>
              <h4 className="mt-2 text-lg font-semibold text-slate-950">{t(lang, "Admission And Enquiry Mix")}</h4>
            </div>
            <Link className="chip-neutral" href="/modules/enquiry">
              {t(lang, "Open Enquiry")}
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {insights.tradeDemand.map((item) => (
              <div key={`${item.trade}-${item.institute}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{item.trade}</p>
                  <p className="text-sm font-semibold text-slate-600">{item.institute}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <span>
                    {t(lang, "Admissions")}: {item.admissions}
                  </span>
                  <span>
                    {t(lang, "Enquiries")}: {item.enquiries}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-100 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-compact">{t(lang, "Session Finance")}</p>
              <h4 className="mt-2 text-lg font-semibold text-slate-950">{t(lang, "Collections And Outstanding")}</h4>
            </div>
            <Link className="chip-neutral" href="/modules/accounts">
              {t(lang, "Open Accounts")}
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {insights.sessionFinancials.map((item) => (
              <div key={item.session} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{item.session}</p>
                  <p className="text-sm font-semibold text-slate-600">
                    {item.totalStudents} {t(lang, "Students")}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <span>
                    {t(lang, "Collected")}: {formatInr(item.collections)}
                  </span>
                  <span>
                    {t(lang, "Due")}: {formatInr(item.dueAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
