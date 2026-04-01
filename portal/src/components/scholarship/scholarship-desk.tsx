"use client";

import { useEffect, useState } from "react";
import { OcrImportDesk } from "@/components/modules/ocr-import-desk";
import { formatInr } from "@/lib/currency";
import { showToast } from "@/lib/toast";

type ScholarshipRow = {
  status: string;
  scholarshipId: string | null;
  queryText: string | null;
  approvedDate: string | null;
  creditedAmount: string | null;
  creditDate: string | null;
  student: {
    id: string;
    studentCode: string;
    fullName: string;
    mobile: string | null;
    session: string;
    yearLabel: string;
    institute: { instituteCode: string; name: string };
    trade: { name: string };
  };
};

const statusOptions = [
  "NOT_APPLIED",
  "APPLIED",
  "UNDER_PROCESS",
  "QUERY_BY_DEPARTMENT",
  "APPROVED",
  "CREDITED",
  "REJECTED"
] as const;

export function ScholarshipDesk() {
  const [rows, setRows] = useState<ScholarshipRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [session, setSession] = useState("");
  const [yearLabel, setYearLabel] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  async function loadRows() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (session.trim()) params.set("session", session.trim());
    if (yearLabel) params.set("yearLabel", yearLabel);

    const response = await fetch(`/api/scholarship?${params.toString()}`);
    const result = await response.json().catch(() => ({ ok: false }));
    if (!response.ok) {
      showToast({
        kind: "error",
        title: "Scholarship queue not loaded",
        message: result?.message || "Unable to load scholarship records."
      });
      setRows([]);
      setCounts({});
      setLoading(false);
      return;
    }

    setRows(Array.isArray(result.rows) ? result.rows : []);
    setCounts(result.counts && typeof result.counts === "object" ? result.counts : {});
    setLoading(false);
  }

  useEffect(() => {
    void loadRows();
  }, [refreshKey]);

  async function saveStatus(row: ScholarshipRow, nextStatus: string) {
    const payload: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "QUERY_BY_DEPARTMENT") {
      const queryText = window.prompt("Enter query remark:", row.queryText || "Document mismatch");
      if (!queryText?.trim()) return;
      payload.queryText = queryText.trim();
    }
    if (nextStatus === "APPROVED") {
      const approvedDate = window.prompt("Approved date (YYYY-MM-DD):", row.approvedDate?.slice(0, 10) || "");
      if (!approvedDate?.trim()) return;
      payload.approvedDate = approvedDate.trim();
    }
    if (nextStatus === "CREDITED") {
      const creditedAmount = window.prompt("Credited amount:", row.creditedAmount || "");
      const creditDate = window.prompt("Credit date (YYYY-MM-DD):", row.creditDate?.slice(0, 10) || "");
      if (!creditedAmount?.trim() || !creditDate?.trim()) return;
      payload.creditedAmount = creditedAmount.trim();
      payload.creditDate = creditDate.trim();
    }
    if (nextStatus === "REJECTED") {
      const queryText = window.prompt("Rejection remark:", row.queryText || "Rejected");
      if (!queryText?.trim()) return;
      payload.queryText = queryText.trim();
    }

    const response = await fetch(`/api/students/${row.student.id}/scholarship`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      showToast({
        kind: "error",
        title: "Scholarship not updated",
        message: result?.message || "Unable to update scholarship status."
      });
      return;
    }
    showToast({
      kind: "success",
      title: "Scholarship updated",
      message: `${row.student.fullName} moved to ${nextStatus}.`
    });
    setRefreshKey((current) => current + 1);
  }

  return (
    <div className="space-y-6">
      <section className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Scholarship Lifecycle Desk</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Scholarship Queue & Status Control</h3>
            <p className="mt-1 text-sm text-slate-600">Track every scholarship stage and update student records directly.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="chip-neutral">Applied: {counts.APPLIED || 0}</span>
            <span className="chip-warning">Under Process: {counts.UNDER_PROCESS || 0}</span>
            <span className="chip-danger">Query: {counts.QUERY_BY_DEPARTMENT || 0}</span>
            <span className="chip-success">Approved: {counts.APPROVED || 0}</span>
            <span className="chip-success">Credited: {counts.CREDITED || 0}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-4">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
            placeholder="Search by student name / code / mobile"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All Status</option>
            {statusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Session (e.g. 2025-26)" value={session} onChange={(event) => setSession(event.target.value)} />
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={yearLabel} onChange={(event) => setYearLabel(event.target.value)}>
            <option value="">All Years</option>
            <option value="1st">1st Year</option>
            <option value="2nd">2nd Year</option>
          </select>
          <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800" type="button" onClick={() => setRefreshKey((current) => current + 1)}>
            Apply Filters
          </button>
        </div>

        <div className="mt-4 data-table-wrap rounded-2xl border border-slate-100 bg-white">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Scholarship</th>
                <th>Current Status</th>
                <th>Query / Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                    Loading scholarship queue...
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((row) => (
                  <tr key={row.student.id}>
                    <td>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{row.student.fullName}</p>
                        <p className="text-xs text-slate-500">
                          {row.student.studentCode} • {row.student.trade.name} • {row.student.session} • {row.student.yearLabel}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1 text-xs text-slate-600">
                        <p>ID: {row.scholarshipId || "-"}</p>
                        <p>Approved: {row.approvedDate ? new Date(row.approvedDate).toLocaleDateString("en-IN") : "-"}</p>
                        <p>Credited: {row.creditedAmount ? formatInr(row.creditedAmount) : "-"}</p>
                      </div>
                    </td>
                    <td>{row.status}</td>
                    <td className="max-w-[260px] text-xs text-slate-600">{row.queryText || "-"}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700" onClick={() => void saveStatus(row, "UNDER_PROCESS")} type="button">
                          Process
                        </button>
                        <button className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800" onClick={() => void saveStatus(row, "QUERY_BY_DEPARTMENT")} type="button">
                          Query
                        </button>
                        <button className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800" onClick={() => void saveStatus(row, "APPROVED")} type="button">
                          Approve
                        </button>
                        <button className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800" onClick={() => void saveStatus(row, "CREDITED")} type="button">
                          Credit
                        </button>
                        <button className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800" onClick={() => void saveStatus(row, "REJECTED")} type="button">
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                    No scholarship records found for current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <OcrImportDesk moduleSlug="scholarship" />
    </div>
  );
}
