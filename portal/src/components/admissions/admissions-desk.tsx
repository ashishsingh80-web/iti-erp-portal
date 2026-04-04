import Link from "next/link";
import type { Route } from "next";
import { AdmissionBulkImport } from "@/components/admissions/admission-bulk-import";
import { AdmissionRegisterBulkBar } from "@/components/admissions/admission-register-bulk-bar";
import { AdmissionsExpandControls } from "@/components/admissions/admissions-expand-controls";
import { AdmissionFormPreview } from "@/components/admissions/admission-form-preview";
import { AdmissionRegisterJump } from "@/components/admissions/admission-register-jump";
import { AdmissionsSectionTabs, buildAdmissionsHref } from "@/components/admissions/admissions-section-tabs";
import { AdmissionStatusActions } from "@/components/admissions/admission-status-actions";
import { AdmissionUnitActions } from "@/components/admissions/admission-unit-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { type AppLanguage, t } from "@/lib/i18n";
import { readAppLanguage } from "@/lib/i18n-server";
import { getAdmissionDeskData, type AdmissionDeskFilters } from "@/lib/services/admission-desk-service";

type AdmissionsDeskProps = {
  filters: AdmissionDeskFilters;
};

function resolveAdmissionsSection(f: AdmissionDeskFilters): "overview" | "register" | "form" | "import" {
  const s = (f.section || "").trim().toLowerCase();
  if (s === "register" || s === "form" || s === "import" || s === "overview") return s;
  if (f.view === "register") return "register";
  return "overview";
}

export async function AdmissionsDesk({ filters }: AdmissionsDeskProps) {
  const lang = await readAppLanguage();
  const data = await getAdmissionDeskData(filters);
  const section = resolveAdmissionsSection(filters);
  const shouldFocusRegister = filters.view === "register";

  function buildAdmissionLink(item: {
    tradeValue: string;
    session: string;
    yearLabel: string;
  }, assignment?: "assigned" | "unassigned", unitNumber?: number) {
    const params = new URLSearchParams();
    params.set("section", "register");
    params.set("tradeValue", item.tradeValue);
    params.set("session", item.session);
    if (item.yearLabel !== "CYCLE") {
      params.set("yearLabel", item.yearLabel);
    }
    if (assignment) {
      params.set("assignment", assignment);
    }
    if (typeof unitNumber === "number") {
      params.set("unitNumber", String(unitNumber));
      params.set("assignment", "assigned");
    }
    params.set("view", "register");
    return `/modules/admissions?${params.toString()}#admission-list`;
  }

  return (
    <div className="grid gap-6">
      <AdmissionsSectionTabs lang={lang} filters={filters} active={section} />

      {section === "overview" ? (
        <>
          <section className="surface p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow-compact">{t(lang, "Admission Control")}</p>
                <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-950">{t(lang, "Admission Dashboard")}</h3>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  {t(
                    lang,
                    "Live visibility for enquiry load, admissions, pending documents, cancellations, and vacant seats. Use the tabs above for register, new admission, or bulk import."
                  )}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                {data.rows.length} {t(lang, "filtered records")}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                lang={lang}
                href="/modules/enquiry"
                label={t(lang, "Total Inquiries")}
                value={String(data.metrics.totalInquiries)}
                helper={t(lang, "Lead pipeline captured in enquiry desk")}
                tone="amber"
              />
              <MetricCard
                lang={lang}
                href={buildAdmissionsHref(filters, "register", { view: "register" })}
                label={t(lang, "Total Admissions")}
                value={String(data.metrics.totalAdmissions)}
                helper={t(lang, "Admissions in current filter view")}
                tone="emerald"
              />
              <MetricCard
                lang={lang}
                href="/modules/students?tab=verification&queue=docs"
                label={t(lang, "Pending Documents")}
                value={String(data.metrics.pendingDocuments)}
                helper={t(lang, "Students waiting for document completion")}
                tone="amber"
              />
              <MetricCard
                lang={lang}
                href={buildAdmissionsHref(filters, "register", { status: "CANCELED", view: "register" })}
                label={t(lang, "Canceled Admissions")}
                value={String(data.metrics.canceledAdmissions)}
                helper={t(lang, "Current rejected / canceled proxy count")}
                tone="rose"
              />
              <MetricCard
                lang={lang}
                href={buildAdmissionsHref(filters, "register")}
                label={t(lang, "Vacant Seats")}
                value={String(data.metrics.vacantSeats)}
                helper={t(lang, "Trade unit capacity still available")}
                tone="sky"
              />
            </div>
          </section>

          <section className="surface p-6">
            <p className="eyebrow-compact">{t(lang, "Workflow")}</p>
            <h3 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-slate-950">{t(lang, "Continue admission work")}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Link
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-900 transition hover:border-emerald-300 hover:bg-white"
                href={buildAdmissionsHref(filters, "register", { view: "register" })}
              >
                {t(lang, "Open admission register")}
              </Link>
              <Link
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-900 transition hover:border-emerald-300 hover:bg-white"
                href={buildAdmissionsHref(filters, "form")}
              >
                {t(lang, "New admission form")}
              </Link>
              <Link
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-900 transition hover:border-emerald-300 hover:bg-white"
                href={buildAdmissionsHref(filters, "import")}
              >
                {t(lang, "Bulk admission CSV")}
              </Link>
            </div>
          </section>
        </>
      ) : null}

      {section === "register" ? (
        <>
          <AdmissionRegisterJump active={shouldFocusRegister} />
          <section className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">{t(lang, "Admission Register")}</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-950">{t(lang, "Search And Filter Admissions")}</h3>
          </div>
          <AdmissionsExpandControls targetId="admissions-expand-zone" />
        </div>

        <div id="admissions-expand-zone">
          <form action="/modules/admissions" className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          <input name="section" type="hidden" value="register" />
          <label className="block space-y-2 xl:col-span-2">
            <span className="text-sm font-medium text-slate-700">{t(lang, "Search")}</span>
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-600" defaultValue={filters.search || ""} name="search" placeholder={t(lang, "Name, code, mobile, father name")} />
          </label>

          <SelectBlock lang={lang} label={t(lang, "Institute")} name="instituteCode" options={data.options.institutes} value={filters.instituteCode || ""} />
          <SelectBlock lang={lang} label={t(lang, "Trade")} name="tradeValue" options={data.options.trades} value={filters.tradeValue || ""} />
          <SelectBlock lang={lang} label={t(lang, "Session")} name="session" options={data.options.sessions} value={filters.session || ""} />
          <SelectBlock lang={lang} label={t(lang, "Year")} name="yearLabel" options={data.options.years} value={filters.yearLabel || ""} />
          <SelectBlock lang={lang} label={t(lang, "Category")} name="category" options={data.options.categories} value={filters.category || ""} />
          <SelectBlock lang={lang} label={t(lang, "Status")} name="status" options={data.options.statuses} value={filters.status || ""} />

          <div className="flex items-end gap-3 xl:col-span-7">
            <button className="btn-primary" type="submit">{t(lang, "Apply Filters")}</button>
            <Link className="btn-secondary" href="/modules/admissions?section=overview">{t(lang, "Reset Filters")}</Link>
          </div>
          </form>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <SummaryBlock lang={lang} title={t(lang, "Trade-wise Admission Count")} items={data.tradeWiseAdmissions} emptyLabel={t(lang, "No trade records yet")} />
            <SummaryBlock lang={lang} title={t(lang, "Session-wise Count")} items={data.sessionWiseAdmissions} emptyLabel={t(lang, "No session records yet")} />
            <SummaryBlock lang={lang} title={t(lang, "Year-wise Count")} items={data.yearWiseAdmissions} emptyLabel={t(lang, "No year records yet")} />
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-900">{t(lang, "Vacant Seat View By Trade / Unit")}</p>
            <div className="mt-3 grid gap-4 xl:grid-cols-2">
              {data.seatView.length ? (
                data.seatView.map((item) => (
                <details key={`${item.tradeValue}-${item.session}-${item.yearLabel}`} className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/80">
                  <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 px-4 py-4 marker:content-none">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{item.tradeName}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.instituteCode} • {item.session} • {item.yearLabel}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-2xl bg-white px-3 py-2 text-right">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t(lang, "Vacant")}</p>
                        <p className="mt-1 text-lg font-semibold text-emerald-700">{item.vacantSeats}</p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        {t(lang, "Expand")}
                      </span>
                    </div>
                  </summary>

                  <div className="border-t border-slate-100 p-4">
                    <div>
                      <a className="mt-1 block text-xs font-medium text-slate-600 hover:text-emerald-700" href={buildAdmissionLink(item, "assigned")}>
                        {t(lang, "Occupancy:")}{" "}
                        {item.usedSeats} / {item.totalCapacity} {t(lang, "used")} (
                        {item.totalCapacity ? Math.round((item.usedSeats / item.totalCapacity) * 100) : 0}%)
                      </a>
                      {item.unassignedSeats ? (
                        <a className="mt-1 block text-xs font-medium text-amber-700 hover:text-amber-800" href={buildAdmissionLink(item, "unassigned")}>
                          {t(lang, "Unassigned admissions:")} {item.unassignedSeats}
                        </a>
                      ) : null}
                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-[width]"
                        style={{
                          width: `${item.totalCapacity ? Math.min((item.usedSeats / item.totalCapacity) * 100, 100) : 0}%`
                        }}
                      />
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <a href={buildAdmissionLink(item)}><MiniInfo label={t(lang, "Capacity")} value={String(item.totalCapacity)} /></a>
                      <a href={buildAdmissionLink(item, "assigned")}><MiniInfo label={t(lang, "Used")} value={String(item.usedSeats)} /></a>
                      <a href={buildAdmissionLink(item)}><MiniInfo label={t(lang, "Vacant")} value={String(item.vacantSeats)} /></a>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]">{t(lang, "Unit")}</th>
                            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]">{t(lang, "Capacity")}</th>
                            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]">{t(lang, "Used")}</th>
                            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]">{t(lang, "Vacant")}</th>
                            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]">{t(lang, "Occupancy")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.units.map((unit) => (
                            <tr key={unit.unitNumber} className="border-t border-slate-100">
                              <td className="px-3 py-2 font-medium text-slate-900">
                                <a className="hover:text-emerald-700" href={buildAdmissionLink(item, "assigned", unit.unitNumber)}>
                                  {t(lang, "Unit")} {unit.unitNumber}
                                </a>
                              </td>
                              <td className="px-3 py-2 text-slate-700">
                                <a className="hover:text-emerald-700" href={buildAdmissionLink(item, "assigned", unit.unitNumber)}>
                                  {unit.capacity}
                                </a>
                              </td>
                              <td className="px-3 py-2 text-slate-700">
                                <a className="hover:text-emerald-700" href={buildAdmissionLink(item, "assigned", unit.unitNumber)}>
                                  {unit.used}
                                </a>
                              </td>
                              <td className={`px-3 py-2 font-semibold ${unit.isFull ? "text-rose-700" : "text-emerald-700"}`}>
                                <a className="hover:text-inherit" href={buildAdmissionLink(item, "assigned", unit.unitNumber)}>
                                  {unit.remaining}
                                </a>
                              </td>
                              <td className="px-3 py-2 font-medium text-slate-700">
                                <a className="hover:text-emerald-700" href={buildAdmissionLink(item, "assigned", unit.unitNumber)}>
                                  {unit.used} / {unit.capacity} ({unit.capacity ? Math.round((unit.used / unit.capacity) * 100) : 0}%)
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>
                ))
              ) : (
                <p className="rounded-3xl border border-slate-100 bg-slate-50/80 px-4 py-5 text-sm text-slate-500">
                  {t(lang, "No seat view available for the current admission filters yet.")}
                </p>
              )}
            </div>
          </div>

          <details className="mt-6 overflow-hidden rounded-3xl border border-slate-100" id="admission-list" open={shouldFocusRegister}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-slate-50 px-4 py-3 marker:content-none">
            <p className="text-sm font-semibold text-slate-900">{t(lang, "Admission Register Table")}</p>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              {t(lang, "Expand")}
            </span>
          </summary>
          <div className="overflow-x-auto px-4 pb-2 pt-2">
            <AdmissionRegisterBulkBar
              rows={data.rows.map((row) => ({
                id: row.id,
                studentCode: row.studentCode,
                fullName: row.fullName,
                documentsStatus: row.documentsStatus
              }))}
            />
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">{t(lang, "Student ID")}</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">{t(lang, "Student")}</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">{t(lang, "Institute / Trade")}</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">{t(lang, "Session / Year")}</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">{t(lang, "Unit")}</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">{t(lang, "Category")}</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">{t(lang, "Admission Status")}</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">{t(lang, "Documents")}</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">{t(lang, "Lifecycle")}</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">{t(lang, "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length ? (
                  data.rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 align-top font-semibold text-slate-900">{row.studentCode}</td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-slate-900">{row.fullName}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.mobile}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-slate-900">{row.instituteName}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.tradeName}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-slate-900">{row.session}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.yearLabel}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`font-medium ${row.unitNumber ? "text-slate-900" : "text-amber-700"}`}>
                          {row.unitNumber ? `${t(lang, "Unit")} ${row.unitNumber}` : t(lang, "Unassigned")}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700">{row.category || "-"}</td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          <StatusBadge status={row.admissionStatusLabel || row.status} />
                          <span className="text-xs text-slate-500">{t(lang, "System:")} {row.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top"><StatusBadge status={row.documentsStatus} /></td>
                      <td className="px-4 py-3 align-top"><StatusBadge status={row.lifecycleStage} /></td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          <Link className="text-sm font-semibold text-emerald-700 hover:text-emerald-800" href={`/students/${row.id}`}>
                            {t(lang, "Open Profile")}
                          </Link>
                          <Link className="text-sm font-semibold text-sky-700 hover:text-sky-800" href={`/admissions/${row.id}`}>
                            {t(lang, "Print Admission")}
                          </Link>
                          <AdmissionUnitActions currentUnitNumber={row.unitNumber} studentId={row.id} />
                          <AdmissionStatusActions studentId={row.id} currentStatus={row.admissionStatusLabel} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={10}>
                      {t(lang, "No admissions match the current filter.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </details>
        </div>
      </section>
        </>
      ) : null}

      {section === "form" ? (
        <section className="surface p-6">
          <p className="eyebrow-compact">{t(lang, "Admission Entry")}</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-950">{t(lang, "New Admission Form")}</h3>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            {t(
              lang,
              "Create a new admission entry with institute, trade, unit, eligibility, parent, and qualification capture."
            )}
          </p>
          <div className="mt-6">
            <AdmissionFormPreview />
          </div>
        </section>
      ) : null}

      {section === "import" ? (
        <section className="surface p-6">
          <p className="eyebrow-compact">{t(lang, "Admission Import")}</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-950">{t(lang, "Bulk Admission Upload")}</h3>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            {t(
              lang,
              "Upload admission CSV data, preview duplicate and invalid rows, then import only the valid records."
            )}
          </p>
          <div className="mt-6">
            <AdmissionBulkImport />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function MetricCard({
  lang,
  label,
  value,
  helper,
  tone,
  href
}: {
  lang: AppLanguage;
  label: string;
  value: string;
  helper: string;
  tone: "emerald" | "amber" | "rose" | "sky";
  href?: string;
}) {
  const toneMap = {
    emerald: "bg-emerald-50 text-emerald-900",
    amber: "bg-amber-50 text-amber-900",
    rose: "bg-rose-50 text-rose-900",
    sky: "bg-sky-50 text-sky-900"
  };

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] opacity-70">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="rounded-full border border-black/10 bg-white/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
          {href ? t(lang, "Open") : t(lang, "Expand")}
        </span>
      </div>
      <p className="mt-3 text-sm opacity-80">{helper}</p>
    </>
  );

  const shell = `block overflow-hidden rounded-3xl px-5 py-4 ${toneMap[tone]} ${href ? "transition hover:ring-2 hover:ring-black/15" : ""}`;

  if (href) {
    return (
      <Link href={href as Route} className={shell}>
        {body}
      </Link>
    );
  }

  return (
    <details className={`overflow-hidden rounded-3xl ${toneMap[tone]}`} open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 marker:content-none">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] opacity-70">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="rounded-full border border-black/10 bg-white/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
          {t(lang, "Expand")}
        </span>
      </summary>
      <div className="border-t border-black/10 px-5 py-4">
        <p className="text-sm opacity-80">{helper}</p>
      </div>
    </details>
  );
}

function SummaryBlock({
  lang,
  title,
  items,
  emptyLabel
}: {
  lang: AppLanguage;
  title: string;
  items: Array<{ label: string; count: number }>;
  emptyLabel: string;
}) {
  return (
    <details className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/80">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 marker:content-none">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
          {t(lang, "Expand")}
        </span>
      </summary>
      <div className="border-t border-slate-100 px-4 py-4">
        <div className="space-y-2">
          {items.length ? (
            items.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm">
                <span className="text-slate-700">{item.label}</span>
                <span className="font-semibold text-slate-950">{item.count}</span>
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-white px-3 py-4 text-sm text-slate-500">{emptyLabel}</p>
          )}
        </div>
      </div>
    </details>
  );
}

function SelectBlock({
  lang,
  label,
  name,
  options,
  value
}: {
  lang: AppLanguage;
  label: string;
  name: string;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-600" defaultValue={value} name={name}>
        <option value="">{t(lang, "All")}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
