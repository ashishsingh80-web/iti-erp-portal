import Link from "next/link";
import { AdmissionBulkImport } from "@/components/admissions/admission-bulk-import";
import { AdmissionsExpandControls } from "@/components/admissions/admissions-expand-controls";
import { AdmissionFormPreview } from "@/components/admissions/admission-form-preview";
import { AdmissionRegisterJump } from "@/components/admissions/admission-register-jump";
import { AdmissionStatusActions } from "@/components/admissions/admission-status-actions";
import { AdmissionUnitActions } from "@/components/admissions/admission-unit-actions";
import { ExpandableSettingsSection } from "@/components/settings/expandable-settings-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { t } from "@/lib/i18n";
import { readAppLanguage } from "@/lib/i18n-server";
import { getAdmissionDeskData, type AdmissionDeskFilters } from "@/lib/services/admission-desk-service";

type AdmissionsDeskProps = {
  filters: AdmissionDeskFilters;
};

export async function AdmissionsDesk({ filters }: AdmissionsDeskProps) {
  const lang = await readAppLanguage();
  const data = await getAdmissionDeskData(filters);
  const shouldFocusRegister = filters.view === "register";

  function buildAdmissionLink(item: {
    tradeValue: string;
    session: string;
    yearLabel: string;
  }, assignment?: "assigned" | "unassigned", unitNumber?: number) {
    const params = new URLSearchParams();
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
      <AdmissionRegisterJump active={shouldFocusRegister} />
      <section className="surface p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow-compact">{t(lang, "Admission Control")}</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-950">{t(lang, "Admission Dashboard")}</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Live visibility for enquiry load, admissions, pending documents, cancellations, and vacant seats before you work on the form.
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {data.rows.length} filtered records
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total Inquiries" value={String(data.metrics.totalInquiries)} helper="Lead pipeline captured in enquiry desk" tone="amber" />
          <MetricCard label="Total Admissions" value={String(data.metrics.totalAdmissions)} helper="Admissions in current filter view" tone="emerald" />
          <MetricCard label="Pending Documents" value={String(data.metrics.pendingDocuments)} helper="Students waiting for document completion" tone="amber" />
          <MetricCard label="Canceled Admissions" value={String(data.metrics.canceledAdmissions)} helper="Current rejected / canceled proxy count" tone="rose" />
          <MetricCard label="Vacant Seats" value={String(data.metrics.vacantSeats)} helper="Trade unit capacity still available" tone="sky" />
        </div>
      </section>

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
          <label className="block space-y-2 xl:col-span-2">
            <span className="text-sm font-medium text-slate-700">Search</span>
            <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-600" defaultValue={filters.search || ""} name="search" placeholder="Name, code, mobile, father name" />
          </label>

          <SelectBlock label="Institute" name="instituteCode" options={data.options.institutes} value={filters.instituteCode || ""} />
          <SelectBlock label="Trade" name="tradeValue" options={data.options.trades} value={filters.tradeValue || ""} />
          <SelectBlock label="Session" name="session" options={data.options.sessions} value={filters.session || ""} />
          <SelectBlock label="Year" name="yearLabel" options={data.options.years} value={filters.yearLabel || ""} />
          <SelectBlock label="Category" name="category" options={data.options.categories} value={filters.category || ""} />
          <SelectBlock label="Status" name="status" options={data.options.statuses} value={filters.status || ""} />

          <div className="flex items-end gap-3 xl:col-span-7">
            <button className="btn-primary" type="submit">Apply Filters</button>
            <Link className="btn-secondary" href="/modules/admissions">Reset</Link>
          </div>
          </form>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <SummaryBlock title="Trade-wise Admission Count" items={data.tradeWiseAdmissions} emptyLabel="No trade records yet" />
            <SummaryBlock title="Session-wise Count" items={data.sessionWiseAdmissions} emptyLabel="No session records yet" />
            <SummaryBlock title="Year-wise Count" items={data.yearWiseAdmissions} emptyLabel="No year records yet" />
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-900">Vacant Seat View By Trade / Unit</p>
            <div className="mt-3 grid gap-4 xl:grid-cols-2">
              {data.seatView.length ? (
                data.seatView.map((item) => (
                <details key={`${item.tradeValue}-${item.session}-${item.yearLabel}`} className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/80" open>
                  <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 px-4 py-4 marker:content-none">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{item.tradeName}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.instituteCode} • {item.session} • {item.yearLabel}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-2xl bg-white px-3 py-2 text-right">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Vacant</p>
                        <p className="mt-1 text-lg font-semibold text-emerald-700">{item.vacantSeats}</p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        Toggle
                      </span>
                    </div>
                  </summary>

                  <div className="border-t border-slate-100 p-4">
                    <div>
                      <a className="mt-1 block text-xs font-medium text-slate-600 hover:text-emerald-700" href={buildAdmissionLink(item, "assigned")}>
                        Occupancy: {item.usedSeats} / {item.totalCapacity} used ({item.totalCapacity ? Math.round((item.usedSeats / item.totalCapacity) * 100) : 0}%)
                      </a>
                      {item.unassignedSeats ? (
                        <a className="mt-1 block text-xs font-medium text-amber-700 hover:text-amber-800" href={buildAdmissionLink(item, "unassigned")}>
                          Unassigned admissions: {item.unassignedSeats}
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
                      <a href={buildAdmissionLink(item)}><MiniInfo label="Capacity" value={String(item.totalCapacity)} /></a>
                      <a href={buildAdmissionLink(item, "assigned")}><MiniInfo label="Used" value={String(item.usedSeats)} /></a>
                      <a href={buildAdmissionLink(item)}><MiniInfo label="Vacant" value={String(item.vacantSeats)} /></a>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]">Unit</th>
                            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]">Capacity</th>
                            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]">Used</th>
                            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]">Vacant</th>
                            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]">Occupancy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.units.map((unit) => (
                            <tr key={unit.unitNumber} className="border-t border-slate-100">
                              <td className="px-3 py-2 font-medium text-slate-900">
                                <a className="hover:text-emerald-700" href={buildAdmissionLink(item, "assigned", unit.unitNumber)}>
                                  Unit {unit.unitNumber}
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
                  No seat view available for the current admission filters yet.
                </p>
              )}
            </div>
          </div>

          <details className="mt-6 overflow-hidden rounded-3xl border border-slate-100" id="admission-list" open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-slate-50 px-4 py-3 marker:content-none">
            <p className="text-sm font-semibold text-slate-900">Admission Register Table</p>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              Toggle
            </span>
          </summary>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">Student ID</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">Student</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">Institute / Trade</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">Session / Year</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">Unit</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">Admission Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">Documents</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">Lifecycle</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">Action</th>
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
                          {row.unitNumber ? `Unit ${row.unitNumber}` : "Unassigned"}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700">{row.category || "-"}</td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          <StatusBadge status={row.admissionStatusLabel || row.status} />
                          <span className="text-xs text-slate-500">System: {row.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top"><StatusBadge status={row.documentsStatus} /></td>
                      <td className="px-4 py-3 align-top"><StatusBadge status={row.lifecycleStage} /></td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          <Link className="text-sm font-semibold text-emerald-700 hover:text-emerald-800" href={`/students/${row.id}`}>
                            Open Profile
                          </Link>
                          <Link className="text-sm font-semibold text-sky-700 hover:text-sky-800" href={`/admissions/${row.id}`}>
                            Print Admission
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
                      No admissions match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </details>
        </div>
      </section>

      <ExpandableSettingsSection
        badges={[
          { label: "New admission", tone: "success" },
          { label: "Photo upload", tone: "neutral" },
          { label: "Eligibility", tone: "neutral" }
        ]}
        defaultOpen={!shouldFocusRegister}
        description="Create a new admission entry with institute, trade, unit, eligibility, parent, and qualification capture."
        eyebrow="Admission Entry"
        title="New Admission Form"
      >
        <AdmissionFormPreview />
      </ExpandableSettingsSection>

      <ExpandableSettingsSection
        badges={[
          { label: "CSV template", tone: "neutral" },
          { label: "Preview duplicates", tone: "warning" },
          { label: "Import valid rows", tone: "success" }
        ]}
        description="Upload admission CSV data, preview duplicate and invalid rows, then import only the valid records."
        eyebrow="Admission Import"
        title="Bulk Admission Upload"
      >
        <AdmissionBulkImport />
      </ExpandableSettingsSection>
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
  label,
  value,
  helper,
  tone
}: {
  label: string;
  value: string;
  helper: string;
  tone: "emerald" | "amber" | "rose" | "sky";
}) {
  const toneMap = {
    emerald: "bg-emerald-50 text-emerald-900",
    amber: "bg-amber-50 text-amber-900",
    rose: "bg-rose-50 text-rose-900",
    sky: "bg-sky-50 text-sky-900"
  };

  return (
    <details className={`overflow-hidden rounded-3xl ${toneMap[tone]}`} open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 marker:content-none">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] opacity-70">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="rounded-full border border-black/10 bg-white/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
          Toggle
        </span>
      </summary>
      <div className="border-t border-black/10 px-5 py-4">
        <p className="text-sm opacity-80">{helper}</p>
      </div>
    </details>
  );
}

function SummaryBlock({
  title,
  items,
  emptyLabel
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
  emptyLabel: string;
}) {
  return (
    <details className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/80" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 marker:content-none">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
          Toggle
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
  label,
  name,
  options,
  value
}: {
  label: string;
  name: string;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-600" defaultValue={value} name={name}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
