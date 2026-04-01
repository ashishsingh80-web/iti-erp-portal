"use client";

import { useEffect, useState } from "react";
import { OcrImportDesk } from "@/components/modules/ocr-import-desk";
import { showToast } from "@/lib/toast";

type PrnRow = {
  entRollNumber: string | null;
  admissionStatus: string | null;
  scvtRegistrationNumber: string | null;
  prnNumber: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | "INCOMPLETE";
  remark: string | null;
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

export function PrnDesk() {
  const [rows, setRows] = useState<PrnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [session, setSession] = useState("");
  const [yearLabel, setYearLabel] = useState("");
  const [onlyMissingPrn, setOnlyMissingPrn] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [counts, setCounts] = useState<{ verification: Record<string, number>; missingPrn: number }>({
    verification: {},
    missingPrn: 0
  });

  async function loadRows() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (session.trim()) params.set("session", session.trim());
    if (yearLabel) params.set("yearLabel", yearLabel);
    if (onlyMissingPrn) params.set("missingPrn", "1");

    const response = await fetch(`/api/prn?${params.toString()}`);
    const result = await response.json().catch(() => ({ ok: false }));
    if (!response.ok) {
      showToast({ kind: "error", title: "PRN queue not loaded", message: result?.message || "Unable to load PRN records." });
      setRows([]);
      setLoading(false);
      return;
    }
    setRows(Array.isArray(result.rows) ? result.rows : []);
    setCounts(result.counts || { verification: {}, missingPrn: 0 });
    setLoading(false);
  }

  useEffect(() => {
    void loadRows();
  }, [refreshKey]);

  async function assignPrn(row: PrnRow) {
    const currentPrn = row.prnNumber || "";
    const prnNumber = window.prompt("Enter PRN Number:", currentPrn);
    if (!prnNumber?.trim()) return;
    const remark = window.prompt("Remark (optional):", row.remark || "") || "";

    const response = await fetch(`/api/students/${row.student.id}/prn-scvt`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prnNumber: prnNumber.trim(),
        entRollNumber: row.entRollNumber,
        admissionStatus: row.admissionStatus,
        scvtRegistrationNumber: row.scvtRegistrationNumber,
        verificationStatus: row.verificationStatus,
        remark: remark.trim() || null
      })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      showToast({ kind: "error", title: "PRN not updated", message: result?.message || "Unable to assign PRN." });
      return;
    }
    showToast({ kind: "success", title: "PRN updated", message: `${row.student.fullName} PRN saved.` });
    setRefreshKey((current) => current + 1);
  }

  return (
    <div className="space-y-6">
      <section className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">PRN Lifecycle Desk</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">PRN Assignment Queue</h3>
            <p className="mt-1 text-sm text-slate-600">Assign PRN after SCVT readiness and keep status/remarks in sync.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="chip-warning">Missing PRN: {counts.missingPrn || 0}</span>
            <span className="chip-success">SCVT Verified: {counts.verification.VERIFIED || 0}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-4">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
            placeholder="Search by student / code / mobile / PRN"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Session (e.g. 2025-26)"
            value={session}
            onChange={(event) => setSession(event.target.value)}
          />
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={yearLabel} onChange={(event) => setYearLabel(event.target.value)}>
            <option value="">All Years</option>
            <option value="1st">1st Year</option>
            <option value="2nd">2nd Year</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
            <input type="checkbox" checked={onlyMissingPrn} onChange={(event) => setOnlyMissingPrn(event.target.checked)} />
            Show only records where PRN is missing
          </label>
          <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800" type="button" onClick={() => setRefreshKey((current) => current + 1)}>
            Apply Filters
          </button>
        </div>

        <div className="mt-4 data-table-wrap rounded-2xl border border-slate-100 bg-white">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>SCVT Readiness</th>
                <th>PRN</th>
                <th>Remark</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                    Loading PRN queue...
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
                    <td className="text-xs text-slate-600">
                      <p>Ent Roll: {row.entRollNumber || "-"}</p>
                      <p>Admission: {row.admissionStatus || "-"}</p>
                      <p>SCVT Reg: {row.scvtRegistrationNumber || "-"}</p>
                      <p>Status: {row.verificationStatus}</p>
                    </td>
                    <td>{row.prnNumber || <span className="chip-warning">Not Assigned</span>}</td>
                    <td className="max-w-[260px] text-xs text-slate-600">{row.remark || "-"}</td>
                    <td>
                      <button className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800" onClick={() => void assignPrn(row)} type="button">
                        {row.prnNumber ? "Update PRN" : "Assign PRN"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                    No PRN records found for current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <OcrImportDesk moduleSlug="prn" />
    </div>
  );
}
