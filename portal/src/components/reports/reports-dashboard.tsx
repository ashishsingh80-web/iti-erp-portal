import Link from "next/link";
import { instituteOptions, sessionOptions, tradeOptions, yearOptions } from "@/lib/constants";
import { ReportActions } from "@/components/reports/report-actions";
import { formatInr, looksLikeMoneyField } from "@/lib/currency";
import { formatEnumLabel } from "@/lib/display";
import { t } from "@/lib/i18n";
import { readAppLanguage } from "@/lib/i18n-server";
import { getReportData, getReportSummaries, paginateReportRows, sortReportRows, type ReportKey } from "@/lib/services/report-service";

const REPORT_CATALOG: Array<{ key: string; label: string }> = [
  { key: "fees-due", label: "Fees Due" },
  { key: "fees-aging-agent-session", label: "Fees Aging (Agent/Session)" },
  { key: "fees-accounts-consistency", label: "Fees-Accounts Consistency" },
  { key: "finance-cashflow-mode", label: "Cashflow by Payment Mode" },
  { key: "finance-fee-collection-trend", label: "Fee Collection Trend" },
  { key: "finance-agent-collection-vs-posting", label: "Agent Collection vs Posting" },
  { key: "document-pending", label: "Document Pending" },
  { key: "prn-scvt-pending", label: "PRN / SCVT Pending" },
  { key: "finance-summary", label: "Finance Summary" },
  { key: "purchase-register", label: "Purchase Register" },
  { key: "vendor-due", label: "Vendor Due" },
  { key: "admissions-summary", label: "Admissions Summary" },
  { key: "scholarship-status", label: "Scholarship Status" },
  { key: "agent-statement", label: "Agent Statement" },
  { key: "attendance-daily", label: "Attendance Daily" },
  { key: "inventory-stock", label: "Inventory Stock" },
  { key: "library-issues", label: "Library Open Issues" },
  { key: "hr-payments", label: "HR Payments" },
  { key: "communication-log", label: "Communication Logs" },
  { key: "grievance-cases", label: "Grievance Cases" },
  { key: "placement-status", label: "Placement Status" },
  { key: "timetable-plan", label: "Timetable Plan" },
  { key: "enquiry-follow-up", label: "Enquiry Follow-up" },
  { key: "institute-comparison", label: "Institute Comparison" },
  { key: "trade-demand", label: "Trade Demand" },
  { key: "session-finance", label: "Session Finance" }
];

const REPORT_PRESET_GROUPS: Array<{
  id: string;
  label: string;
  items: Array<{ label: string; href: string }>;
}> = [
  {
    id: "daily",
    label: "Daily Operations",
    items: [
      { label: "Admissions Queue", href: "/modules/reports?report=admissions-summary" },
      { label: "Enquiry Follow-up", href: "/modules/reports?report=enquiry-follow-up" },
      { label: "Attendance Daily", href: "/modules/reports?report=attendance-daily" },
      { label: "Communication Logs", href: "/modules/reports?report=communication-log" },
      { label: "Grievance Cases", href: "/modules/reports?report=grievance-cases" }
    ]
  },
  {
    id: "compliance",
    label: "Compliance & Registration",
    items: [
      { label: "Docs Pending", href: "/modules/reports?report=document-pending" },
      { label: "Verification workbench", href: "/modules/students?tab=verification&queue=pending_any" },
      { label: "Scholarship Query", href: "/modules/reports?report=scholarship-status&scholarshipStatus=QUERY_BY_DEPARTMENT" },
      { label: "PRN / SCVT Pending", href: "/modules/reports?report=prn-scvt-pending" },
      { label: "Timetable Plan", href: "/modules/reports?report=timetable-plan" }
    ]
  },
  {
    id: "finance",
    label: "Finance & Accounts",
    items: [
      { label: "Fees Due", href: "/modules/reports?report=fees-due" },
      { label: "Fees Aging", href: "/modules/reports?report=fees-aging-agent-session" },
      { label: "Fees-Accounts Consistency", href: "/modules/reports?report=fees-accounts-consistency" },
      { label: "Cashflow by Payment Mode", href: "/modules/reports?report=finance-cashflow-mode" },
      { label: "Fee Collection Trend", href: "/modules/reports?report=finance-fee-collection-trend" },
      { label: "Agent Collection vs Posting", href: "/modules/reports?report=finance-agent-collection-vs-posting" },
      { label: "Finance Summary", href: "/modules/reports?report=finance-summary" },
      { label: "Vendor Due", href: "/modules/reports?report=vendor-due" },
      { label: "Agent Statement", href: "/modules/reports?report=agent-statement" },
      { label: "HR Payments", href: "/modules/reports?report=hr-payments" }
    ]
  },
  {
    id: "resources",
    label: "Resources & Outcomes",
    items: [
      { label: "Inventory Stock", href: "/modules/reports?report=inventory-stock" },
      { label: "Library Open Issues", href: "/modules/reports?report=library-issues" },
      { label: "Placement Status", href: "/modules/reports?report=placement-status" },
      { label: "Institute Comparison", href: "/modules/reports?report=institute-comparison" },
      { label: "Trade Demand", href: "/modules/reports?report=trade-demand" },
      { label: "Session Finance", href: "/modules/reports?report=session-finance" }
    ]
  }
];

export async function ReportsDashboard({
  filters
}: {
  filters: {
    report?: string;
    search?: string;
    instituteCode?: string;
    session?: string;
    yearLabel?: string;
    tradeValue?: string;
    admissionMode?: string;
    paymentMode?: string;
    studentStatus?: string;
    documentStatus?: string;
    paymentStatus?: string;
    scholarshipStatus?: string;
    enquiryStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortDir?: string;
    page?: string;
    pageSize?: string;
  };
}) {
  const lang = await readAppLanguage();
  const activeFilters = {
    search: filters.search || "",
    instituteCode: filters.instituteCode || "",
    session: filters.session || "",
    yearLabel: filters.yearLabel || "",
    tradeValue: filters.tradeValue || "",
    admissionMode: filters.admissionMode || "",
    paymentMode: filters.paymentMode || "",
    studentStatus: filters.studentStatus || "",
    documentStatus: filters.documentStatus || "",
    paymentStatus: filters.paymentStatus || "",
    scholarshipStatus: filters.scholarshipStatus || "",
    enquiryStatus: filters.enquiryStatus || "",
    dateFrom: filters.dateFrom || "",
    dateTo: filters.dateTo || "",
    sortBy: filters.sortBy || "",
    sortDir: filters.sortDir || "asc",
    page: filters.page || "1",
    pageSize: filters.pageSize || "10"
  };

  const defaultPreviewKeys: ReportKey[] = [
    "admissions-summary",
    "document-pending",
    "fees-due",
    "agent-statement",
    "enquiry-follow-up",
    "finance-summary"
  ];
  const previewKeys = filters.report ? [filters.report as ReportKey] : defaultPreviewKeys;
  const [summaries, allPreviews] = await Promise.all([
    getReportSummaries(activeFilters),
    Promise.all(previewKeys.map((key) => getReportData(key, activeFilters)))
  ]);
  const previews = allPreviews.map((report) => ({
    ...report,
    rows: activeFilters.sortBy ? sortReportRows(report.rows, activeFilters.sortBy, activeFilters.sortDir) : report.rows
  }));
  const sharedQuery = new URLSearchParams(
    Object.entries(activeFilters).filter(([, value]) => value)
  ).toString();

  function reportCatalogLabel(reportKey: string) {
    const row = REPORT_CATALOG.find((item) => item.key === reportKey);
    return row ? t(lang, row.label) : reportKey;
  }

  function filterChipEnumValue(raw: string) {
    const pretty = formatEnumLabel(raw);
    return t(lang, pretty);
  }

  const activeFilterChips = [
    filters.report ? `${t(lang, "Report")}: ${reportCatalogLabel(filters.report)}` : "",
    filters.search ? `${t(lang, "Search")}: ${filters.search}` : "",
    filters.instituteCode ? `${t(lang, "Institute")}: ${filters.instituteCode}` : "",
    filters.session ? `${t(lang, "Session")}: ${filters.session}` : "",
    filters.yearLabel ? `${t(lang, "Year")}: ${filters.yearLabel}` : "",
    filters.tradeValue ? `${t(lang, "Trade")}: ${filters.tradeValue}` : "",
    filters.admissionMode ? `${t(lang, "Admission Mode")}: ${filterChipEnumValue(filters.admissionMode)}` : "",
    filters.paymentMode ? `${t(lang, "Payment Mode")}: ${filterChipEnumValue(filters.paymentMode)}` : "",
    filters.studentStatus ? `${t(lang, "Admission Status")}: ${filterChipEnumValue(filters.studentStatus)}` : "",
    filters.documentStatus ? `${t(lang, "Document Status")}: ${filterChipEnumValue(filters.documentStatus)}` : "",
    filters.paymentStatus ? `${t(lang, "Payment Status")}: ${filterChipEnumValue(filters.paymentStatus)}` : "",
    filters.scholarshipStatus ? `${t(lang, "Scholarship status")}: ${filterChipEnumValue(filters.scholarshipStatus)}` : "",
    filters.enquiryStatus ? `${t(lang, "Enquiry Status")}: ${filterChipEnumValue(filters.enquiryStatus)}` : "",
    filters.dateFrom ? `${t(lang, "From")}: ${filters.dateFrom}` : "",
    filters.dateTo ? `${t(lang, "To")}: ${filters.dateTo}` : ""
  ].filter(Boolean);

  const quickExports = REPORT_CATALOG.map((item) => ({
    key: item.key,
    label: t(lang, item.label)
  }));
  const totalMatchedRows = previews.reduce((sum, report) => sum + report.rows.length, 0);
  const currentPage = Math.max(Number(activeFilters.page || "1"), 1);
  const pageSize = Math.max(Number(activeFilters.pageSize || "10"), 1);

  function buildSortHref(reportKey: string, header: string) {
    const params = new URLSearchParams(sharedQuery);
    params.set("report", reportKey);
    const nextDir = filters.report === reportKey && activeFilters.sortBy === header && activeFilters.sortDir === "asc" ? "desc" : "asc";
    params.set("sortBy", header);
    params.set("sortDir", nextDir);
    params.set("page", "1");
    return `/modules/reports?${params.toString()}`;
  }

  function buildPageHref(reportKey: string, nextPage: number) {
    const params = new URLSearchParams(sharedQuery);
    params.set("report", reportKey);
    params.set("page", String(nextPage));
    params.set("pageSize", String(pageSize));
    return `/modules/reports?${params.toString()}`;
  }

  function buildPageSizeHref(reportKey: string, nextPageSize: string) {
    const params = new URLSearchParams(sharedQuery);
    params.set("report", reportKey);
    params.set("page", "1");
    params.set("pageSize", nextPageSize);
    return `/modules/reports?${params.toString()}`;
  }

  function buildExportHref(reportKey: string, scope: "full" | "current" = "full") {
    const params = new URLSearchParams(sharedQuery);
    params.set("report", reportKey);
    params.set("format", "csv");
    if (scope === "current") {
      params.set("exportScope", "current");
      params.set("page", String(currentPage));
      params.set("pageSize", String(pageSize));
    } else {
      params.delete("exportScope");
    }
    return `/api/reports?${params.toString()}`;
  }

  function sortIndicator(header: string) {
    if (activeFilters.sortBy !== header) return "↕";
    return activeFilters.sortDir === "asc" ? "↑" : "↓";
  }

  function formatReportCell(header: string, value: string) {
    const raw = String(value ?? "").trim();
    if (looksLikeMoneyField(header)) {
      const numeric = Number(raw.replace(/,/g, ""));
      if (!Number.isFinite(numeric)) return raw || "-";
      return formatInr(numeric);
    }
    if (!raw) return "-";
    if (raw === "All") return t(lang, "All");
    if (/^[A-Z][A-Z0-9_]*$/.test(raw)) {
      return t(lang, formatEnumLabel(raw));
    }
    return raw;
  }

  function translateSummaryHelper(item: { key: string; helper: string }) {
    if (item.key === "finance-summary" && item.helper.startsWith("Net balance for ")) {
      const suffix = item.helper.slice("Net balance for ".length);
      return `${t(lang, "Net balance for")} ${suffix}`;
    }
    return t(lang, item.helper);
  }

  function translateSummaryValue(item: { value: string | number }) {
    const v = String(item.value ?? "").trim();
    if (v === "All") return t(lang, "All");
    return String(item.value ?? "");
  }

  function buildQueueHref(studentIds: string[]) {
    const params = new URLSearchParams();
    params.set("ids", studentIds.join(","));
    return `/modules/students?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <section className="surface p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{t(lang, "Report Filters")}</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">{t(lang, "Search Criteria")}</h3>
          <p className="mt-2 text-sm text-slate-600">{t(lang, "Filter reports by report type, student search, institute, session, year, and date range.")}</p>
        </div>

        <form action="/modules/reports" className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.report || ""} name="report">
            <option value="">{t(lang, "All report previews")}</option>
            {REPORT_CATALOG.map((item) => (
              <option key={item.key} value={item.key}>
                {t(lang, item.label)}
              </option>
            ))}
          </select>
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" defaultValue={filters.search || ""} name="search" placeholder={t(lang, "Student, code, mobile, vendor")} />
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.instituteCode || ""} name="instituteCode">
            <option value="">{t(lang, "All institutes")}</option>
            {instituteOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.session || ""} name="session">
            <option value="">{t(lang, "All sessions")}</option>
            {sessionOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <details className="sm:col-span-2 xl:col-span-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">
              {t(lang, "Advanced Filters")}
            </summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.yearLabel || ""} name="yearLabel">
                <option value="">{t(lang, "All years")}</option>
                {yearOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.tradeValue || ""} name="tradeValue">
                <option value="">{t(lang, "All trades")}</option>
                {tradeOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.admissionMode || ""} name="admissionMode">
                <option value="">{t(lang, "All admission modes")}</option>
                <option value="DIRECT">{t(lang, formatEnumLabel("DIRECT"))}</option>
                <option value="AGENT">{t(lang, formatEnumLabel("AGENT"))}</option>
              </select>
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.paymentMode || ""} name="paymentMode">
                <option value="">{t(lang, "All payment modes")}</option>
                <option value="CASH">{t(lang, formatEnumLabel("CASH"))}</option>
                <option value="UPI">{t(lang, formatEnumLabel("UPI"))}</option>
                <option value="ONLINE">{t(lang, formatEnumLabel("ONLINE"))}</option>
                <option value="BANK_TRANSFER">{t(lang, formatEnumLabel("BANK_TRANSFER"))}</option>
                <option value="AGENT_COLLECTION">{t(lang, formatEnumLabel("AGENT_COLLECTION"))}</option>
              </select>
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.studentStatus || ""} name="studentStatus">
                <option value="">{t(lang, "All admission statuses")}</option>
                <option value="DRAFT">{t(lang, formatEnumLabel("DRAFT"))}</option>
                <option value="IN_PROGRESS">{t(lang, formatEnumLabel("IN_PROGRESS"))}</option>
                <option value="UNDER_REVIEW">{t(lang, formatEnumLabel("UNDER_REVIEW"))}</option>
                <option value="COMPLETED">{t(lang, formatEnumLabel("COMPLETED"))}</option>
                <option value="REJECTED">{t(lang, formatEnumLabel("REJECTED"))}</option>
              </select>
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.documentStatus || ""} name="documentStatus">
                <option value="">{t(lang, "All document statuses")}</option>
                <option value="PENDING">{t(lang, formatEnumLabel("PENDING"))}</option>
                <option value="VERIFIED">{t(lang, formatEnumLabel("VERIFIED"))}</option>
                <option value="INCOMPLETE">{t(lang, formatEnumLabel("INCOMPLETE"))}</option>
                <option value="REJECTED">{t(lang, formatEnumLabel("REJECTED"))}</option>
              </select>
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.paymentStatus || ""} name="paymentStatus">
                <option value="">{t(lang, "All payment statuses")}</option>
                <option value="UNPAID">{t(lang, formatEnumLabel("UNPAID"))}</option>
                <option value="PARTIAL">{t(lang, formatEnumLabel("PARTIAL"))}</option>
                <option value="PAID">{t(lang, formatEnumLabel("PAID"))}</option>
                <option value="OVERDUE">{t(lang, formatEnumLabel("OVERDUE"))}</option>
              </select>
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.scholarshipStatus || ""} name="scholarshipStatus">
                <option value="">{t(lang, "All scholarship statuses")}</option>
                <option value="NOT_APPLIED">{t(lang, formatEnumLabel("NOT_APPLIED"))}</option>
                <option value="APPLIED">{t(lang, formatEnumLabel("APPLIED"))}</option>
                <option value="UNDER_PROCESS">{t(lang, formatEnumLabel("UNDER_PROCESS"))}</option>
                <option value="QUERY_BY_DEPARTMENT">{t(lang, formatEnumLabel("QUERY_BY_DEPARTMENT"))}</option>
                <option value="APPROVED">{t(lang, formatEnumLabel("APPROVED"))}</option>
                <option value="REJECTED">{t(lang, formatEnumLabel("REJECTED"))}</option>
              </select>
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.enquiryStatus || ""} name="enquiryStatus">
                <option value="">{t(lang, "All enquiry statuses")}</option>
                <option value="NEW">{t(lang, formatEnumLabel("NEW"))}</option>
                <option value="FOLLOW_UP">{t(lang, formatEnumLabel("FOLLOW_UP"))}</option>
                <option value="VISIT_SCHEDULED">{t(lang, formatEnumLabel("VISIT_SCHEDULED"))}</option>
                <option value="COUNSELLED">{t(lang, formatEnumLabel("COUNSELLED"))}</option>
                <option value="INTERESTED">{t(lang, formatEnumLabel("INTERESTED"))}</option>
                <option value="DOCUMENTS_PENDING">{t(lang, formatEnumLabel("DOCUMENTS_PENDING"))}</option>
                <option value="CONVERTED">{t(lang, formatEnumLabel("CONVERTED"))}</option>
                <option value="LOST">{t(lang, formatEnumLabel("LOST"))}</option>
              </select>
              <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" defaultValue={filters.dateFrom || ""} name="dateFrom" type="date" />
              <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" defaultValue={filters.dateTo || ""} name="dateTo" type="date" />
            </div>
          </details>
          <div className="flex flex-wrap gap-3 sm:col-span-2 xl:col-span-4">
            <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white" type="submit">
              {t(lang, "Apply Filters")}
            </button>
            <Link className="rounded-2xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-800" href="/modules/reports">
              {t(lang, "Reset Filters")}
            </Link>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap gap-3">
          {activeFilterChips.length ? (
            activeFilterChips.map((item) => (
              <span key={item} className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                {item}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t(lang, "No active filters")}
            </span>
          )}
        </div>

        <div className="mt-5 space-y-3">
          {REPORT_PRESET_GROUPS.map((group) => (
            <div key={group.id} className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t(lang, group.label)}</span>
              {group.items.map((preset) => {
                const presetQuery = preset.href.split("?")[1] || "";
                const isActive =
                  !!presetQuery &&
                  presetQuery.split("&").every((part) => {
                    const [key, value] = part.split("=");
                    return filters[key as keyof typeof filters] === value;
                  });

                return (
                  <a
                    key={preset.href}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                      isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                    href={preset.href}
                  >
                    {t(lang, preset.label)}
                  </a>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section className="surface p-6 print:border-none print:shadow-none">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{t(lang, "Current View")}</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">{t(lang, "Report Summary")}</h3>
            <p className="mt-2 text-sm text-slate-600">
              {previews.length} {t(lang, "report panels matched with")} {totalMatchedRows}{" "}
              {t(lang, "total rows in the current filtered view.")}
            </p>
          </div>
          <ReportActions />
        </div>
      </section>

      <section className="surface p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{t(lang, "Export Center")}</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">{t(lang, "Quick Downloads")}</h3>
          <p className="mt-2 text-sm text-slate-600">
            {t(lang, "Every export below respects the current report filters and date criteria.")}
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickExports.map((item) => (
            <Link
              key={item.key}
              className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-800 transition hover:border-emerald-300 hover:text-emerald-800"
              href={`/api/reports?report=${item.key}${sharedQuery ? `&${sharedQuery}` : ""}&format=csv`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaries.map((item) => (
          <article key={item.key} className="surface p-5">
            <Link
              className="group block rounded-2xl outline-none ring-slate-900/5 transition hover:bg-slate-50/90 focus-visible:ring-2 -m-2 p-2"
              href={`/modules/reports?report=${item.key}${sharedQuery ? `&${sharedQuery}` : ""}`}
            >
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t(lang, item.title)}</p>
              <p className="mt-3 font-serif text-4xl font-semibold tracking-tight text-slate-900 group-hover:text-emerald-900">
                {looksLikeMoneyField(item.title) ? formatInr(item.value) : translateSummaryValue(item)}
              </p>
              <p className="mt-2 text-sm text-slate-600">{translateSummaryHelper(item)}</p>
              <span className="mt-4 inline-flex text-sm font-semibold text-emerald-800 group-hover:underline">
                {t(lang, "Open Report")}
              </span>
            </Link>
            <a
              className="mt-4 inline-flex text-sm font-semibold text-slate-600 hover:underline"
              href={`/api/reports?report=${item.key}${sharedQuery ? `&${sharedQuery}` : ""}&format=csv`}
            >
              {t(lang, "Export CSV")}
            </a>
          </article>
        ))}
      </section>

      <section className="grid gap-6">
        {previews.map((report) => (
          <article key={report.key} className="surface p-6">
            {(() => {
              const totalPages = Math.max(Math.ceil(report.rows.length / pageSize), 1);
              const safePage = Math.min(currentPage, totalPages);
              const visibleRows = paginateReportRows(report.rows, safePage, pageSize);
              const visibleStudentIds = visibleRows
                .map((row) => row._studentId)
                .filter(Boolean);
              return (
                <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{t(lang, "Live Report")}</p>
                <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">{t(lang, report.title)}</h3>
                <p className="mt-2 text-sm text-slate-600">{t(lang, report.description)}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {report.rows.length} {t(lang, "matched rows")}
                </p>
              </div>
              <div className="flex w-full flex-wrap gap-3 xl:w-auto">
                <Link
                  className="btn-secondary"
                  href={`/modules/reports?report=${report.key}${sharedQuery ? `&${sharedQuery}` : ""}`}
                >
                  {t(lang, "Focus Report")}
                </Link>
                <a className="btn-primary" href={buildExportHref(report.key, "full")}>
                  {t(lang, "Download Full CSV")}
                </a>
                <a className="btn-secondary" href={buildExportHref(report.key, "current")}>
                  {t(lang, "Current Page CSV")}
                </a>
                {visibleStudentIds.length ? (
                  <a className="btn-secondary" href={buildQueueHref(visibleStudentIds)}>
                    {t(lang, "Open Visible In Queue")}
                  </a>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-slate-600">
                {t(lang, "Showing")}{" "}
                {(report.rows.length && (safePage - 1) * pageSize + 1) || 0}-
                {Math.min(safePage * pageSize, report.rows.length)} {t(lang, "of")} {report.rows.length}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-slate-600">{t(lang, "Rows")}</span>
                <div className="flex gap-2">
                  {["10", "25", "50"].map((size) => (
                    <a key={size} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${String(pageSize) === size ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-700"}`} href={buildPageSizeHref(report.key, size)}>
                      {size}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 max-h-[55vh] overflow-auto rounded-3xl border border-slate-100 lg:max-h-[60vh]">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                  <tr>
                    {report.headers.map((header) => (
                      <th key={header} className="px-4 py-2.5 font-medium">
                        <a className="inline-flex items-center gap-2 hover:text-slate-800" href={buildSortHref(report.key, header)}>
                          <span>{t(lang, header)}</span>
                          <span className="text-xs text-slate-400">{sortIndicator(header)}</span>
                        </a>
                      </th>
                    ))}
                    {report.rows.some((row) => row._detailHref) ? (
                      <th className="px-4 py-2.5 font-medium">{t(lang, "Action")}</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length ? (
                    visibleRows.map((row, index) => (
                      <tr key={`${report.key}-${index}`} className="border-t border-slate-100 align-top">
                        {report.headers.map((header) => (
                          <td key={header} className="px-4 py-2.5 text-slate-700">
                            {formatReportCell(header, row[header] || "")}
                          </td>
                        ))}
                        {report.rows.some((item) => item._detailHref) ? (
                          <td className="px-4 py-2.5">
                            {row._detailHref ? (
                              <a className="text-sm font-semibold text-emerald-800 hover:underline" href={row._detailHref}>
                                {row._detailLabel ? t(lang, row._detailLabel) : t(lang, "Open")}
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                        ) : null}
                      </tr>
                    ))
                  ) : (
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-8 text-center text-slate-500" colSpan={report.headers.length + (report.rows.some((row) => row._detailHref) ? 1 : 0)}>
                        {t(lang, "No rows currently in this queue")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                {t(lang, "Page")} {safePage} {t(lang, "of")} {totalPages}
              </p>
              <div className="flex gap-2">
                <a className={`rounded-xl border px-4 py-2 text-sm font-semibold ${safePage <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-700"}`} href={buildPageHref(report.key, safePage - 1)}>
                  {t(lang, "Previous")}
                </a>
                <a className={`rounded-xl border px-4 py-2 text-sm font-semibold ${safePage >= totalPages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-700"}`} href={buildPageHref(report.key, safePage + 1)}>
                  {t(lang, "Next")}
                </a>
              </div>
            </div>
                </>
              );
            })()}
          </article>
        ))}
      </section>
    </div>
  );
}
