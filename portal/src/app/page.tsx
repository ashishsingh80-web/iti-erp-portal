import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { DashboardInsightsSection } from "@/components/dashboard/dashboard-insights-section";
import { DashboardInsightsSkeleton } from "@/components/dashboard/dashboard-insights-skeleton";
import { DashboardOperationsSkeleton } from "@/components/dashboard/dashboard-operations-skeleton";
import { DashboardOperations } from "@/components/modules/dashboard-operations";
import { MetricCard } from "@/components/metric-card";
import { requireUser } from "@/lib/auth";
import { formatInr } from "@/lib/currency";
import { dashboardMetricHref, dashboardRiskSegmentHref } from "@/lib/dashboard-deep-links";
import { readDashboardPreferences } from "@/lib/dashboard-preferences";
import { t } from "@/lib/i18n";
import { readAppLanguage } from "@/lib/i18n-server";
import { portalNavigationGroups, portalModules } from "@/lib/module-config";
import { getDashboardMetrics } from "@/lib/services/dashboard-service";

function toMetricMap(metrics: Awaited<ReturnType<typeof getDashboardMetrics>>) {
  return Object.fromEntries(metrics.map((item) => [item.label, Number(item.value) || 0]));
}

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const query = await searchParams;
  const selectedSession = typeof query.session === "string" ? query.session : null;
  const [lang, metricsResult, dashboardPreferences] = await Promise.all([
    readAppLanguage(),
    getDashboardMetrics(selectedSession).catch(() => [] as Awaited<ReturnType<typeof getDashboardMetrics>>),
    readDashboardPreferences()
  ]);
  const visibleWidgets = new Set(dashboardPreferences.visibleWidgets);
  let dashboardCards: Awaited<ReturnType<typeof getDashboardMetrics>> = metricsResult;
  if (dashboardCards.length < 2) {
    dashboardCards = [
      { label: "Active Sessions", value: "N/A", helper: "Dashboard metrics unavailable right now" },
      { label: "Total Students", value: "N/A", helper: "Dashboard metrics unavailable right now" },
      { label: "Pending Admissions", value: "N/A", helper: "Dashboard metrics unavailable right now" },
      { label: "Docs Pending", value: "N/A", helper: "Dashboard metrics unavailable right now" },
      { label: "Fee Due Cases", value: "N/A", helper: "Dashboard metrics unavailable right now" }
    ];
  }
  const metricMap = toMetricMap(dashboardCards);

  const riskSegments = [
    { label: "Docs", value: metricMap["Docs Pending"] || 0, color: "#f59e0b" },
    { label: "Fees", value: metricMap["Fee Due Cases"] || 0, color: "#ef4444" },
    { label: "Enquiry", value: metricMap["Follow-Ups Due"] || 0, color: "#14b8a6" },
    { label: "PRN", value: metricMap["PRN Pending"] || 0, color: "#0f766e" },
    { label: "SCVT", value: metricMap["SCVT Pending"] || 0, color: "#2563eb" },
    { label: "Scholarship", value: metricMap["Scholarship Queries"] || 0, color: "#7c3aed" }
  ];
  const totalRisk = riskSegments.reduce((sum, item) => sum + item.value, 0) || 1;
  const pieGradient = riskSegments
    .reduce(
      (acc, item) => {
        const start = acc.offset;
        const end = start + (item.value / totalRisk) * 100;
        acc.parts.push(`${item.color} ${start}% ${end}%`);
        acc.offset = end;
        return acc;
      },
      { parts: [] as string[], offset: 0 }
    )
    .parts.join(", ");

  const pipelineBars = [
    { label: "Enquiries", value: metricMap["Follow-Ups Due"] || 0, color: "from-teal-400 to-cyan-500" },
    { label: "Admissions", value: metricMap["Pending Admissions"] || 0, color: "from-orange-400 to-orange-500" },
    { label: "Eligibility", value: metricMap["10th Check Pending"] || 0, color: "from-sky-400 to-blue-500" },
    { label: "Fees Due", value: metricMap["Fee Due Cases"] || 0, color: "from-rose-400 to-red-500" },
    { label: "Queries", value: metricMap["Scholarship Queries"] || 0, color: "from-amber-400 to-yellow-500" }
  ];
  const maxBar = Math.max(...pipelineBars.map((item) => item.value), 1);
  const displayMetricValue = (label: string, value: string) => (label === "Today's Available Cash" ? formatInr(value) : value);

  const groupedModules = portalNavigationGroups.map((group) => ({
    ...group,
    modules: group.slugs
      .map((slug) => portalModules.find((item) => item.slug === slug))
      .filter(Boolean)
  }));

  return (
    <div className="space-y-6">
      {visibleWidgets.has("hero") ? (
        <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#06281f_0%,#0a4c3d_48%,#f28c1b_120%)] p-8 text-white shadow-2xl">
        <div className="absolute inset-y-0 right-0 hidden w-[34%] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_55%)] lg:block" />
        <div className="relative grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
          <div>
            <h2 className="mt-1 max-w-3xl font-serif text-4xl font-semibold tracking-tight">
              Adarsh Rashtriya Private ITI
              <span className="block text-white/90">&amp; Babu Harbansh Bahadur Singh Private ITI</span>
            </h2>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900" href="/modules/admissions">
                {t(lang, "New Admission")}
              </Link>
              <Link className="rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white" href="/modules/students?tab=verification">
                {t(lang, "Verification workbench")}
              </Link>
              <Link className="rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white" href="/modules/management">
                {t(lang, "Group Dashboard")}
              </Link>
              <Link className="rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white" href="/modules/reports?report=agent-statement">
                {t(lang, "Agent Reports")}
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <div className="flex flex-col items-center text-center">
                <div className="shrink-0 leading-none">
                  <Image
                    alt="Institute logo"
                    className="object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.22)]"
                    height={164}
                    priority
                    src="/portal-logo.png"
                    width={164}
                  />
                </div>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  Adarsh Rashtriya Private ITI
                  <span className="block text-white/90">&amp; Babu Harbansh Bahadur Singh Private ITI</span>
                </h3>
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.25em] text-white/60">{t(lang, "Current Session View")}</p>
              <p className="mt-3 font-serif text-3xl font-semibold text-white">{dashboardCards[0]?.value || "Active"}</p>
              <p className="mt-2 text-sm text-white/75">{dashboardCards[0]?.helper}</p>
            </div>
          </div>
        </div>
        </section>
      ) : null}

      {visibleWidgets.has("metrics") ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {dashboardCards.slice(1).map((card) => {
            const cardHref = dashboardMetricHref(card.label, selectedSession);
            return (
              <MetricCard
                key={card.label}
                helper={card.helper ? t(lang, card.helper) : undefined}
                href={cardHref ? (cardHref as Route) : undefined}
                label={t(lang, card.label)}
                value={displayMetricValue(card.label, card.value)}
              />
            );
          })}
        </section>
      ) : null}

      {visibleWidgets.has("insights") ? (
        <Suspense fallback={<DashboardInsightsSkeleton />}>
          <DashboardInsightsSection lang={lang} selectedSession={selectedSession} />
        </Suspense>
      ) : null}

      {visibleWidgets.has("caseMix") || visibleWidgets.has("workflow") ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          {visibleWidgets.has("caseMix") ? (
            <article className="surface p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-compact">{t(lang, "Case Mix")}</p>
              <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-950">{t(lang, "Pending Load Distribution")}</h3>
            </div>
            <Link className="chip-success" href="/modules/students?tab=verification">
              {t(lang, "Open Queue")}
            </Link>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="flex items-center justify-center">
              <div
                className="relative flex h-52 w-52 items-center justify-center rounded-full"
                style={{ background: `conic-gradient(${pieGradient})` }}
              >
                <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t(lang, "Open Cases")}</p>
                  <p className="mt-2 font-serif text-4xl font-semibold text-slate-950">{totalRisk}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3">
              {riskSegments.map((item) => {
                const segHref = dashboardRiskSegmentHref(item.label, selectedSession);
                const inner = (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{item.value}</p>
                  </div>
                );
                return segHref ? (
                  <Link
                    key={item.label}
                    href={segHref as Route}
                    className="block rounded-2xl border border-slate-100 bg-white px-4 py-3 transition hover:border-emerald-300 hover:shadow-sm"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={item.label} className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
            </article>
          ) : null}

          {visibleWidgets.has("workflow") ? (
            <article className="surface p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-compact">{t(lang, "Workflow Pulse")}</p>
              <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-950">{t(lang, "Action Trend")}</h3>
            </div>
            <span className="chip-neutral">{t(lang, "Today")}</span>
          </div>
          <div className="mt-6 grid gap-4">
            {pipelineBars.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-600">{item.value}</p>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                    style={{ width: `${Math.max((item.value / maxBar) * 100, item.value ? 12 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t(lang, "Cash Snapshot")}</p>
              <p className="mt-2 font-serif text-2xl font-semibold leading-tight text-slate-950 md:text-3xl">
                {displayMetricValue("Today's Available Cash", dashboardCards.find((item) => item.label === "Today's Available Cash")?.value || "0")}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {dashboardCards.find((item) => item.label === "Today's Available Cash")?.helper}
              </p>
            </div>
          </div>
            </article>
          ) : null}
        </section>
      ) : null}

      {visibleWidgets.has("moduleQueues") ? (
        <section className="grid gap-6 xl:grid-cols-3">
          {groupedModules.map((group, index) => (
            <article key={`${group.key}-${index}`} className="surface p-6">
            <p className="eyebrow-compact">{group.title}</p>
            <div className="mt-4 space-y-3">
              {group.modules.map((module) => (
                <Link
                  key={module!.slug}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-4 transition hover:border-emerald-200 hover:bg-emerald-50/50"
                  href={module!.slug === "dashboard" ? "/" : `/modules/${module!.slug}`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t(lang, module!.title)}</p>
                    <p className="mt-1 text-xs text-slate-500">{module!.highlights.map((item) => t(lang, item)).join(" • ")}</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-800">{lang === "hi" ? "खोलें" : "Open"}</span>
                </Link>
              ))}
            </div>
            </article>
          ))}
        </section>
      ) : null}

      {visibleWidgets.has("operations") ? (
        <Suspense fallback={<DashboardOperationsSkeleton />}>
          <DashboardOperations maxBoards={4} />
        </Suspense>
      ) : null}
    </div>
  );
}
