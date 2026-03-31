"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatInr } from "@/lib/currency";
import { formatEnumLabel } from "@/lib/display";
import { t } from "@/lib/i18n";
import type { StudentDirectoryRow } from "@/lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useAppLanguage } from "@/lib/use-app-language";

export function StudentDirectoryPreview() {
  const lang = useAppLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<StudentDirectoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const sortBy = searchParams.get("sortBy") || "fullName";
  const sortDir = searchParams.get("sortDir") || "asc";
  const page = Math.max(Number(searchParams.get("page") || "1"), 1);
  const pageSize = Math.max(Number(searchParams.get("pageSize") || "25"), 1);

  const totalLabel = useMemo(() => `${total} records`, [total]);
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const pagedRows = rows;
  const activeFilters = useMemo(
    () =>
      [
        "status",
        "documentsStatus",
        "eligibilityStatus",
        "paymentStatus",
        "scholarshipStatus",
        "missingPrn",
        "missingScvt",
        "scvtVerificationStatus",
        "undertakingGenerationStatus",
        "undertakingSignedStatus"
      ]
        .map((key) => ({ key, value: searchParams.get(key) || "" }))
        .filter((item) => item.value),
    [searchParams]
  );
  const queuePresets = [
    { label: "Fees Due", href: "/modules/students?paymentStatus=UNPAID" },
    { label: "Docs Pending", href: "/modules/students?documentsStatus=PENDING" },
    { label: "Scholarship Query", href: "/modules/students?scholarshipStatus=QUERY_BY_DEPARTMENT" },
    { label: "PRN Missing", href: "/modules/students?missingPrn=1" },
    { label: "SCVT Missing", href: "/modules/students?missingScvt=1" },
    { label: "Undertaking Pending", href: "/modules/students?undertakingGenerationStatus=PENDING" }
  ];
  const allPageSelected = pagedRows.length > 0 && pagedRows.every((row) => selectedIds.includes(row.id));
  const selectedRows = rows.filter((row) => selectedIds.includes(row.id));

  function updateSort(nextSortBy: string) {
    const params = new URLSearchParams(searchParams.toString());
    const nextDir = sortBy === nextSortBy && sortDir === "asc" ? "desc" : "asc";
    params.set("sortBy", nextSortBy);
    params.set("sortDir", nextDir);
    params.set("page", "1");
    router.replace(`/modules/students?${params.toString()}`);
  }

  function updatePage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.replace(`/modules/students?${params.toString()}`);
  }

  function updatePageSize(nextPageSize: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", nextPageSize);
    params.set("page", "1");
    router.replace(`/modules/students?${params.toString()}`);
  }

  function buildExportHref(scope: "full" | "current" = "full") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("format", "csv");
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    if (scope === "current") {
      params.set("exportScope", "current");
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
    } else {
      params.delete("exportScope");
    }
    return `/api/students?${params.toString()}`;
  }

  function sortIndicator(column: string) {
    if (sortBy !== column) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  }

  function toggleStudent(studentId: string) {
    setSelectedIds((current) =>
      current.includes(studentId) ? current.filter((item) => item !== studentId) : [...current, studentId]
    );
  }

  function toggleCurrentPage() {
    setSelectedIds((current) => {
      if (allPageSelected) {
        return current.filter((item) => !pagedRows.some((row) => row.id === item));
      }

      return Array.from(new Set([...current, ...pagedRows.map((row) => row.id)]));
    });
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function exportSelectedCsv() {
    if (!selectedRows.length) return;

    const headers = ["Student Code", "Name", "Institute", "Trade", "Session", "Year", "Status", "Documents", "Eligibility", "Due"];
    const escapeCsv = (value: string) =>
      value.includes(",") || value.includes("\"") || value.includes("\n")
        ? `"${value.replace(/"/g, "\"\"")}"`
        : value;
    const body = selectedRows.map((row) =>
      [
        row.studentCode,
        row.fullName,
        row.instituteName,
        row.tradeName,
        row.session,
        row.yearLabel,
        formatEnumLabel(row.status),
        formatEnumLabel(row.documentsStatus),
        formatEnumLabel(row.eligibilityStatus),
        row.dueAmount
      ].map((item) => escapeCsv(String(item || ""))).join(",")
    );

    const blob = new Blob([[headers.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "selected-students.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openSelectedProfiles() {
    selectedRows.slice(0, 10).forEach((row) => {
      window.open(`/students/${row.id}`, "_blank", "noopener,noreferrer");
    });
  }

  async function loadStudents(nextSearch = search, options?: { syncUrl?: boolean }) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams(searchParams.toString());
      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      else params.delete("search");

      if (options?.syncUrl !== false) {
        router.replace(`/modules/students?${params.toString()}`);
      }

      const response = await fetch(`/api/students?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result?.message || "Failed to load students");
        return;
      }

      setRows(result.rows || []);
      setTotal(Number(result.total || 0));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    loadStudents(searchParams.get("search") || "", { syncUrl: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((item) => rows.some((row) => row.id === item)));
  }, [rows]);

  return (
    <section className="surface overflow-hidden">
      <div className="border-b border-slate-200/70 px-6 py-5">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{t(lang, "Students")}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-3xl font-semibold tracking-tight">{t(lang, "Student Directory")}</h3>
          <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{totalLabel}</span>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          {t(lang, "This view represents the database-backed replacement for slow spreadsheet filtering.")}
        </p>
      </div>

      <div className="grid gap-4 border-b border-slate-100 px-6 py-5 sm:grid-cols-2 xl:grid-cols-6">
        <input
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-emerald-600 sm:col-span-2 xl:col-span-2"
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t(lang, "Search by name, code, or mobile")}
          value={search}
        />
        <button
          className="rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white"
          onClick={() => loadStudents()}
          type="button"
        >
          {loading ? t(lang, "Loading...") : t(lang, "Apply Search")}
        </button>
        <button
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
          onClick={() => {
            setSearch("");
            router.replace("/modules/students");
          }}
          type="button"
        >
          {t(lang, "Reset")}
        </button>
      </div>

      {activeFilters.length ? (
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-6 py-4">
          {activeFilters.map((item) => (
            <span key={item.key} className="rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              {item.key}: {item.value}
            </span>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="border-b border-rose-100 bg-rose-50 px-6 py-4 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Saved Queues</span>
          {queuePresets.map((preset) => {
            const presetQuery = preset.href.split("?")[1] || "";
            const isActive =
              !!presetQuery &&
              presetQuery.split("&").every((part) => {
                const [key, value] = part.split("=");
                return searchParams.get(key) === value;
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
      </div>

      {selectedIds.length ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50 px-6 py-4 text-sm">
          <p className="font-semibold text-emerald-800">{selectedIds.length} students selected</p>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white" onClick={exportSelectedCsv} type="button">
              Export Selected CSV
            </button>
            <button className="rounded-xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-800" onClick={openSelectedProfiles} type="button">
              Open Selected Profiles
            </button>
            <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" onClick={clearSelection} type="button">
              Clear Selection
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 text-sm">
        <p className="text-slate-600">
          Showing {(total && (page - 1) * pageSize + 1) || 0}-
          {Math.min((page - 1) * pageSize + rows.length, total)} of {total}
        </p>
        <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">
          <label className="text-slate-600">Rows</label>
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => updatePageSize(event.target.value)} value={String(pageSize)}>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <a className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white" href={buildExportHref("full")}>
            Download Full CSV
          </a>
          <a className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" href={buildExportHref("current")}>
            Current Page CSV
          </a>
        </div>
      </div>

      <div className="max-h-[65vh] overflow-auto lg:max-h-[70vh]">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
            <tr>
              <th className="px-5 py-3 font-medium">
                <button className="inline-flex items-center gap-2 hover:text-slate-800" onClick={toggleCurrentPage} type="button">
                  <span>{allPageSelected ? "Clear" : "Select"}</span>
                </button>
              </th>
              {[
                ["Student Code", "studentCode"],
                ["Name", "fullName"],
                ["Unit", "unitNumber"],
                ["Institute", "instituteName"],
                ["Trade", "tradeName"],
                ["Session", "session"],
                ["Status", "status"],
                ["Docs", "documentsStatus"],
                ["Eligibility", "eligibilityStatus"],
                ["Due", "dueAmount"]
              ].map(([header, key]) => (
                <th key={header} className="px-5 py-3 font-medium">
                  <button className="inline-flex items-center gap-2 hover:text-slate-800" onClick={() => updateSort(key)} type="button">
                    <span>{header}</span>
                    <span className="text-xs text-slate-400">{sortIndicator(key)}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.length ? pagedRows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 align-top">
                <td className="px-5 py-3">
                  <ToggleSwitch checked={selectedIds.includes(row.id)} compact onChange={() => toggleStudent(row.id)} variant="neutral" />
                </td>
                <td className="px-5 py-3">{row.studentCode}</td>
                <td className="px-5 py-3 font-medium text-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700">
                      {row.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt={row.fullName} className="h-full w-full object-cover" src={row.photoUrl} />
                      ) : (
                        row.fullName.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <Link className="text-emerald-800 hover:underline" href={`/students/${row.id}`}>
                      {row.fullName}
                    </Link>
                  </div>
                </td>
                <td className="px-5 py-3">{row.unitNumber}</td>
                <td className="px-5 py-3">
                  <div className="font-medium text-slate-900">{row.instituteName}</div>
                  <div className="text-xs text-slate-500">{row.instituteCode}</div>
                </td>
                <td className="px-5 py-3">{row.tradeName}</td>
                <td className="px-5 py-3">{row.session}</td>
                <td className="px-5 py-3"><StatusBadge status={row.status} /></td>
                <td className="px-5 py-3"><StatusBadge status={row.documentsStatus} /></td>
                <td className="px-5 py-3"><StatusBadge status={row.eligibilityStatus} /></td>
                <td className="px-5 py-3">{formatInr(row.dueAmount)}</td>
              </tr>
            )) : (
              <tr className="border-t border-slate-100">
                <td className="px-5 py-8 text-center text-slate-500" colSpan={11}>
                  {loading ? "Loading students..." : "No students found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
        <p className="text-sm text-slate-600">Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50" disabled={page <= 1} onClick={() => updatePage(page - 1)} type="button">
            Previous
          </button>
          <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50" disabled={page >= totalPages} onClick={() => updatePage(page + 1)} type="button">
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
