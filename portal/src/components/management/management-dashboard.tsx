import Link from "next/link";
import { ManagementPrintActions } from "@/components/management/management-print-actions";
import { formatInr } from "@/lib/currency";
import { sessionOptions } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { readAppLanguage } from "@/lib/i18n-server";
import { readInstituteBrandingConfig } from "@/lib/institute-branding-config";
import { getDashboardInsights, getDashboardMetrics } from "@/lib/services/dashboard-service";

export async function ManagementDashboard({
  filters
}: {
  filters: {
    session?: string;
  };
}) {
  const lang = await readAppLanguage();
  const selectedSession = filters.session || null;
  const [dashboardCards, insights, brandingConfig] = await Promise.all([
    getDashboardMetrics(selectedSession),
    getDashboardInsights(selectedSession),
    readInstituteBrandingConfig()
  ]);
  const printableBranding = brandingConfig.institutes.filter(
    (item) => item.logoUrl || item.contactPhone || item.contactEmail || item.campusName
  );
  const primaryLogo = printableBranding[0]?.logoUrl || "/portal-logo.png";
  const displayMetricValue = (label: string, value: string) => (label === "Today's Available Cash" ? formatInr(value) : value);

  return (
    <div className="space-y-6">
      <section className="surface p-6 print:shadow-none">
        <div className="mb-6 hidden items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 print:flex">
          <div className="flex items-start gap-4">
            <img alt="Institute logo" className="h-20 w-20 object-contain" src={primaryLogo} />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{t(lang, "Executive MIS")}</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-950">
                {t(lang, "Management Control Desk")}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {selectedSession ? `${t(lang, "Session View")}: ${selectedSession}` : t(lang, "All Active Sessions")}
              </p>
            </div>
          </div>
          <div className="text-right text-sm text-slate-600">
            <p>{new Date().toLocaleDateString("en-IN")}</p>
            <p className="mt-1">{new Date().toLocaleTimeString("en-IN")}</p>
          </div>
        </div>

        {printableBranding.length ? (
          <div className="mb-6 hidden grid-cols-2 gap-4 print:grid">
            {printableBranding.map((item) => (
              <article key={item.instituteCode} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.instituteCode}</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{item.campusName || item.instituteCode}</p>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  {item.contactPhone ? <p>Phone: {item.contactPhone}</p> : null}
                  {item.contactEmail ? <p>Email: {item.contactEmail}</p> : null}
                  {item.website ? <p>Website: {item.website}</p> : null}
                  {item.principalName ? <p>Head: {item.principalName}</p> : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow-compact">{t(lang, "Executive MIS")}</p>
            <h3 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-slate-950">
              {t(lang, "Management Control Desk")}
            </h3>
            <p className="mt-3 max-w-3xl text-sm text-slate-600">
              {t(lang, "Track institute performance, demand, finance, and monthly conversion movement from one printable view.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 print:hidden">
            <Link className="chip-neutral" href="/modules/reports?report=institute-comparison">
              {t(lang, "Institute Report")}
            </Link>
            <Link className="chip-neutral" href="/modules/reports?report=trade-demand">
              {t(lang, "Trade Report")}
            </Link>
            <Link className="chip-neutral" href="/modules/reports?report=session-finance">
              {t(lang, "Session Report")}
            </Link>
            <ManagementPrintActions />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {insights.managementCards.map((card: (typeof insights.managementCards)[number]) => (
            <article key={card.label} className="rounded-3xl border border-slate-100 bg-white px-5 py-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{t(lang, card.label)}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</p>
              <p className="mt-2 text-sm text-slate-600">{t(lang, card.helper)}</p>
            </article>
          ))}
        </div>

        <form action="/modules/management" className="mt-6 flex flex-wrap items-end gap-3 print:hidden">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t(lang, "Session View")}</span>
            <select
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              defaultValue={filters.session || ""}
              name="session"
            >
              <option value="">{t(lang, "All Active Sessions")}</option>
              {sessionOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white" type="submit">
            {t(lang, "Apply")}
          </button>
          <Link className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700" href="/modules/management">
            {t(lang, "Reset")}
          </Link>
        </form>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboardCards.slice(1, 5).map((card: (typeof dashboardCards)[number]) => (
            <article key={card.label} className="rounded-3xl border border-slate-100 bg-slate-50 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{t(lang, card.label)}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{displayMetricValue(card.label, card.value)}</p>
              <p className="mt-1 text-sm text-slate-600">{t(lang, card.helper || "")}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="surface p-6 print:break-inside-avoid">
          <p className="eyebrow-compact">{t(lang, "Institute Comparison")}</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-950">{t(lang, "Student Load And Risk")}</h4>
          <div className="mt-4 space-y-3">
            {insights.instituteComparison.map((item: (typeof insights.instituteComparison)[number]) => (
              <div key={item.code || item.institute} className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.institute}</p>
                    <p className="text-xs text-slate-500">{item.code}</p>
                  </div>
                  <p className="text-lg font-semibold text-slate-950">{item.totalStudents}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <span>{t(lang, "Docs Pending")}: {item.docsPending}</span>
                  <span>{t(lang, "Fee Due Cases")}: {item.feeDueCases}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="surface p-6 print:break-inside-avoid">
          <p className="eyebrow-compact">{t(lang, "Trade Demand")}</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-950">{t(lang, "Admissions And Enquiry Mix")}</h4>
          <div className="mt-4 space-y-3">
            {insights.tradeDemand.map((item: (typeof insights.tradeDemand)[number]) => (
              <div key={`${item.trade}-${item.institute}`} className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.trade}</p>
                    <p className="text-xs text-slate-500">{item.institute}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-950">{item.admissions + item.enquiries}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <span>{t(lang, "Admissions")}: {item.admissions}</span>
                  <span>{t(lang, "Enquiries")}: {item.enquiries}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="surface p-6 print:break-inside-avoid">
          <p className="eyebrow-compact">{t(lang, "Session Finance")}</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-950">{t(lang, "Collections And Outstanding")}</h4>
          <div className="mt-4 space-y-3">
            {insights.sessionFinancials.map((item: (typeof insights.sessionFinancials)[number]) => (
              <div key={item.session} className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{item.session}</p>
                  <p className="text-sm font-semibold text-slate-500">{item.totalStudents} {t(lang, "Students")}</p>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-600">
                  <span>{t(lang, "Collected")}: {formatInr(item.collections)}</span>
                  <span>{t(lang, "Outstanding Due")}: {formatInr(item.dueAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="surface p-6 print:break-inside-avoid">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">{t(lang, "Monthly Trend")}</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-950">{t(lang, "Admission Conversion Sheet")}</h4>
          </div>
          <span className="chip-success">{t(lang, "Last 6 Months")}</span>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                <th className="px-3 py-2">{t(lang, "Month")}</th>
                <th className="px-3 py-2">{t(lang, "Admissions")}</th>
                <th className="px-3 py-2">{t(lang, "Enquiries")}</th>
                <th className="px-3 py-2">{t(lang, "Conversions")}</th>
                <th className="px-3 py-2">{t(lang, "Conversion Rate")}</th>
              </tr>
            </thead>
            <tbody>
              {insights.trend.map((item: (typeof insights.trend)[number]) => (
                <tr key={item.month} className="rounded-2xl bg-slate-50 text-sm text-slate-700">
                  <td className="rounded-l-2xl px-3 py-3 font-semibold text-slate-900">{item.month}</td>
                  <td className="px-3 py-3">{item.admissions}</td>
                  <td className="px-3 py-3">{item.enquiries}</td>
                  <td className="px-3 py-3">{item.conversions}</td>
                  <td className="rounded-r-2xl px-3 py-3 font-semibold text-slate-900">{item.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
