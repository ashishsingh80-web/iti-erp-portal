import Link from "next/link";
import { instituteOptions, sessionOptions, tradeOptions, yearOptions } from "@/lib/constants";
import { ReportActions } from "@/components/reports/report-actions";
import { formatInr, looksLikeMoneyField } from "@/lib/currency";
import { t } from "@/lib/i18n";
import { readAppLanguage } from "@/lib/i18n-server";
import { getReportData, getReportSummaries, paginateReportRows, sortReportRows } from "@/lib/services/report-service";

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

  const [
    summaries,
    admissionsSummary,
    feesDue,
    feesAgingAgentSession,
    feesAccountsConsistency,
    financeCashflowMode,
    financeFeeCollectionTrend,
    financeAgentCollectionVsPosting,
    docsPending,
    prnPending,
    financeSummary,
    purchaseRegister,
    vendorDue,
    scholarshipStatus,
    agentStatement,
    enquiryFollowUp,
    instituteComparison,
    tradeDemand,
    sessionFinance
  ] = await Promise.all([
    getReportSummaries(activeFilters),
    getReportData("admissions-summary", activeFilters),
    getReportData("fees-due", activeFilters),
    getReportData("fees-aging-agent-session", activeFilters),
    getReportData("fees-accounts-consistency", activeFilters),
    getReportData("finance-cashflow-mode", activeFilters),
    getReportData("finance-fee-collection-trend", activeFilters),
    getReportData("finance-agent-collection-vs-posting", activeFilters),
    getReportData("document-pending", activeFilters),
    getReportData("prn-scvt-pending", activeFilters),
    getReportData("finance-summary", activeFilters),
    getReportData("purchase-register", activeFilters),
    getReportData("vendor-due", activeFilters),
    getReportData("scholarship-status", activeFilters),
    getReportData("agent-statement", activeFilters),
    getReportData("enquiry-follow-up", activeFilters),
    getReportData("institute-comparison", activeFilters),
    getReportData("trade-demand", activeFilters),
    getReportData("session-finance", activeFilters)
  ]);

  const allPreviews = [
    admissionsSummary,
    feesDue,
    feesAgingAgentSession,
    feesAccountsConsistency,
    financeCashflowMode,
    financeFeeCollectionTrend,
    financeAgentCollectionVsPosting,
    docsPending,
    prnPending,
    financeSummary,
    purchaseRegister,
    vendorDue,
    scholarshipStatus,
    agentStatement,
    enquiryFollowUp,
    instituteComparison,
    tradeDemand,
    sessionFinance
  ];
  const previews = (filters.report ? allPreviews.filter((item) => item.key === filters.report) : allPreviews).map((report) => ({
    ...report,
    rows: activeFilters.sortBy ? sortReportRows(report.rows, activeFilters.sortBy, activeFilters.sortDir) : report.rows
  }));
  const sharedQuery = new URLSearchParams(
    Object.entries(activeFilters).filter(([, value]) => value)
  ).toString();
  const activeFilterChips = [
    filters.report ? `Report: ${filters.report}` : "",
    filters.search ? `Search: ${filters.search}` : "",
    filters.instituteCode ? `Institute: ${filters.instituteCode}` : "",
    filters.session ? `Session: ${filters.session}` : "",
    filters.yearLabel ? `Year: ${filters.yearLabel}` : "",
    filters.tradeValue ? `Trade: ${filters.tradeValue}` : "",
    filters.admissionMode ? `Admission Mode: ${filters.admissionMode}` : "",
    filters.paymentMode ? `Payment Mode: ${filters.paymentMode}` : "",
    filters.studentStatus ? `Admission Status: ${filters.studentStatus}` : "",
    filters.documentStatus ? `Document Status: ${filters.documentStatus}` : "",
    filters.paymentStatus ? `Payment Status: ${filters.paymentStatus}` : "",
    filters.scholarshipStatus ? `Scholarship Status: ${filters.scholarshipStatus}` : "",
    filters.enquiryStatus ? `Enquiry Status: ${filters.enquiryStatus}` : "",
    filters.dateFrom ? `From: ${filters.dateFrom}` : "",
    filters.dateTo ? `To: ${filters.dateTo}` : ""
  ].filter(Boolean);
  const quickExports = [
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
    { key: "enquiry-follow-up", label: "Enquiry Follow-up" },
    { key: "institute-comparison", label: "Institute Comparison" },
    { key: "trade-demand", label: "Trade Demand" },
    { key: "session-finance", label: "Session Finance" }
  ];
  const reportPresets = [
    { label: "Fees Due", href: "/modules/reports?report=fees-due" },
    { label: "Fees Aging", href: "/modules/reports?report=fees-aging-agent-session" },
    { label: "Fees-Accounts Consistency", href: "/modules/reports?report=fees-accounts-consistency" },
    { label: "Cashflow by Payment Mode", href: "/modules/reports?report=finance-cashflow-mode" },
    { label: "Fee Collection Trend", href: "/modules/reports?report=finance-fee-collection-trend" },
    { label: "Agent Collection vs Posting", href: "/modules/reports?report=finance-agent-collection-vs-posting" },
    { label: "Docs Pending", href: "/modules/reports?report=document-pending" },
    { label: "Scholarship Query", href: "/modules/reports?report=scholarship-status&scholarshipStatus=QUERY_BY_DEPARTMENT" },
    { label: "PRN / SCVT Pending", href: "/modules/reports?report=prn-scvt-pending" },
    { label: "Admissions Queue", href: "/modules/reports?report=admissions-summary" },
    { label: "Finance Summary", href: "/modules/reports?report=finance-summary" },
    { label: "Vendor Due", href: "/modules/reports?report=vendor-due" },
    { label: "Agent Statement", href: "/modules/reports?report=agent-statement" },
    { label: "Enquiry Follow-up", href: "/modules/reports?report=enquiry-follow-up" },
    { label: "Institute Comparison", href: "/modules/reports?report=institute-comparison" },
    { label: "Trade Demand", href: "/modules/reports?report=trade-demand" },
    { label: "Session Finance", href: "/modules/reports?report=session-finance" }
  ];
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
    if (!looksLikeMoneyField(header)) return value || "-";
    const numeric = Number(String(value || "").replace(/,/g, ""));
    if (!Number.isFinite(numeric)) return value || "-";
    return formatInr(numeric);
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
            <option value="fees-due">Fees Due</option>
            <option value="fees-aging-agent-session">Fees Aging (Agent/Session)</option>
            <option value="fees-accounts-consistency">Fees-Accounts Consistency</option>
            <option value="finance-cashflow-mode">Cashflow by Payment Mode</option>
            <option value="finance-fee-collection-trend">Fee Collection Trend</option>
            <option value="finance-agent-collection-vs-posting">Agent Collection vs Posting</option>
            <option value="document-pending">Document Pending</option>
            <option value="prn-scvt-pending">PRN / SCVT Pending</option>
            <option value="finance-summary">Finance Summary</option>
            <option value="purchase-register">Purchase Register</option>
            <option value="vendor-due">Vendor Due</option>
            <option value="admissions-summary">Admissions Summary</option>
            <option value="scholarship-status">Scholarship Status</option>
            <option value="agent-statement">Agent Statement</option>
            <option value="enquiry-follow-up">Enquiry Follow-up</option>
            <option value="institute-comparison">Institute Comparison</option>
            <option value="trade-demand">Trade Demand</option>
            <option value="session-finance">Session Finance</option>
          </select>
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" defaultValue={filters.search || ""} name="search" placeholder={t(lang, "Student, code, mobile, vendor")} />
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.instituteCode || ""} name="instituteCode">
            <option value="">All institutes</option>
            {instituteOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.session || ""} name="session">
            <option value="">All sessions</option>
            {sessionOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.yearLabel || ""} name="yearLabel">
            <option value="">All years</option>
            {yearOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.tradeValue || ""} name="tradeValue">
            <option value="">All trades</option>
            {tradeOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.admissionMode || ""} name="admissionMode">
            <option value="">All admission modes</option>
            <option value="DIRECT">Direct</option>
            <option value="AGENT">Agent</option>
          </select>
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.paymentMode || ""} name="paymentMode">
            <option value="">All payment modes</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="ONLINE">Online</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="AGENT_COLLECTION">Agent Collection</option>
          </select>
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.studentStatus || ""} name="studentStatus">
            <option value="">All admission statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.documentStatus || ""} name="documentStatus">
            <option value="">All document statuses</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="INCOMPLETE">Incomplete</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.paymentStatus || ""} name="paymentStatus">
            <option value="">All payment statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
          </select>
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.scholarshipStatus || ""} name="scholarshipStatus">
            <option value="">All scholarship statuses</option>
            <option value="NOT_APPLIED">Not Applied</option>
            <option value="APPLIED">Applied</option>
            <option value="UNDER_PROCESS">Under Process</option>
            <option value="QUERY_BY_DEPARTMENT">Query by Department</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={filters.enquiryStatus || ""} name="enquiryStatus">
            <option value="">All enquiry statuses</option>
            <option value="NEW">New</option>
            <option value="FOLLOW_UP">Follow Up</option>
            <option value="VISIT_SCHEDULED">Visit Scheduled</option>
            <option value="COUNSELLED">Counselled</option>
            <option value="INTERESTED">Interested</option>
            <option value="DOCUMENTS_PENDING">Documents Pending</option>
            <option value="CONVERTED">Converted</option>
            <option value="LOST">Lost</option>
          </select>
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" defaultValue={filters.dateFrom || ""} name="dateFrom" type="date" />
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" defaultValue={filters.dateTo || ""} name="dateTo" type="date" />
          <div className="flex flex-wrap gap-3 sm:col-span-2 xl:col-span-2">
            <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white" type="submit">
              {t(lang, "Apply Filters")}
            </button>
            <Link className="rounded-2xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-800" href="/modules/reports">
              {t(lang, "Clear")}
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
              No active filters
            </span>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Saved Reports</span>
          {reportPresets.map((preset) => {
            const presetQuery = preset.href.split("?")[1] || "";
            const isActive =
              !!presetQuery &&
              presetQuery.split("&").every((part) => {
                const [key, value] = part.split("=");
                return filters[key as keyof typeof filters] === value;
              });

            return (
              <a
                key={preset.label}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                  isActive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                href={preset.href}
              >
                {preset.label}
              </a>
            );
          })}
        </div>
      </section>

      <section className="surface p-6 print:border-none print:shadow-none">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Current View</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Report Summary</h3>
            <p className="mt-2 text-sm text-slate-600">
              {previews.length} report panels matched with {totalMatchedRows} total rows in the current filtered view.
            </p>
          </div>
          <ReportActions />
        </div>
      </section>

      <section className="surface p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Export Center</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Quick Downloads</h3>
          <p className="mt-2 text-sm text-slate-600">Every export below respects the current report filters and date criteria.</p>
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
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.title}</p>
            <p className="mt-3 font-serif text-4xl font-semibold tracking-tight text-slate-900">
              {looksLikeMoneyField(item.title) ? formatInr(item.value) : item.value}
            </p>
            <p className="mt-2 text-sm text-slate-600">{item.helper}</p>
            <Link
              className="mt-4 inline-flex text-sm font-semibold text-emerald-800 hover:underline"
              href={`/modules/reports?report=${item.key}${sharedQuery ? `&${sharedQuery}` : ""}`}
            >
              Open Report
            </Link>
            <Link
              className="mt-2 inline-flex text-sm font-semibold text-slate-600 hover:underline"
              href={`/api/reports?report=${item.key}${sharedQuery ? `&${sharedQuery}` : ""}&format=csv`}
            >
              Export CSV
            </Link>
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
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Live Report</p>
                <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">{report.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{report.description}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{report.rows.length} matched rows</p>
              </div>
              <div className="flex w-full flex-wrap gap-3 xl:w-auto">
                <Link
                  className="rounded-full bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-800"
                  href={`/modules/reports?report=${report.key}${sharedQuery ? `&${sharedQuery}` : ""}`}
                >
                  Focus Report
                </Link>
                <a className="rounded-full bg-emerald-800 px-4 py-3 text-sm font-semibold text-white" href={buildExportHref(report.key, "full")}>
                  Download Full CSV
                </a>
                <a className="rounded-full bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-800" href={buildExportHref(report.key, "current")}>
                  Current Page CSV
                </a>
                {visibleStudentIds.length ? (
                  <a className="rounded-full bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-800" href={buildQueueHref(visibleStudentIds)}>
                    Open Visible In Queue
                  </a>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-slate-600">
                Showing {(report.rows.length && (safePage - 1) * pageSize + 1) || 0}-{Math.min(safePage * pageSize, report.rows.length)} of {report.rows.length}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-slate-600">Rows</span>
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
                          <span>{header}</span>
                          <span className="text-xs text-slate-400">{sortIndicator(header)}</span>
                        </a>
                      </th>
                    ))}
                    {report.rows.some((row) => row._detailHref) ? <th className="px-4 py-2.5 font-medium">Action</th> : null}
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
                                {row._detailLabel || "Open"}
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
                        No rows currently in this queue
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">Page {safePage} of {totalPages}</p>
              <div className="flex gap-2">
                <a className={`rounded-xl border px-4 py-2 text-sm font-semibold ${safePage <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-700"}`} href={buildPageHref(report.key, safePage - 1)}>
                  Previous
                </a>
                <a className={`rounded-xl border px-4 py-2 text-sm font-semibold ${safePage >= totalPages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-700"}`} href={buildPageHref(report.key, safePage + 1)}>
                  Next
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
