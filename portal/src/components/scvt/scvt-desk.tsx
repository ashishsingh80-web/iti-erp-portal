"use client";

import { useEffect, useState } from "react";
import { OcrImportDesk } from "@/components/modules/ocr-import-desk";
import { showToast } from "@/lib/toast";

type ScvtRow = {
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

const verificationOptions = ["PENDING", "VERIFIED", "REJECTED", "INCOMPLETE"] as const;

export function ScvtDesk() {
  const [rows, setRows] = useState<ScvtRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [session, setSession] = useState("");
  const [yearLabel, setYearLabel] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  async function loadRows() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (verificationStatus) params.set("verificationStatus", verificationStatus);
    if (session.trim()) params.set("session", session.trim());
    if (yearLabel) params.set("yearLabel", yearLabel);

    const response = await fetch(`/api/scvt?${params.toString()}`);
    const result = await response.json().catch(() => ({ ok: false }));
    if (!response.ok) {
      showToast({ kind: "error", title: "SCVT queue not loaded", message: result?.message || "Unable to load SCVT records." });
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

  async function updateRow(row: ScvtRow, nextStatus: (typeof verificationOptions)[number]) {
    const entRollNumber =
      window.prompt("Entry roll number:", row.entRollNumber || "") || row.entRollNumber || "";
    const admissionStatus =
      window.prompt("Admission status:", row.admissionStatus || "") || row.admissionStatus || "";
    const scvtRegistrationNumber =
      window.prompt("SCVT registration number:", row.scvtRegistrationNumber || "") || row.scvtRegistrationNumber || "";
    const remark = window.prompt("Remark (optional):", row.remark || "") || "";

    if (nextStatus === "VERIFIED" && (!entRollNumber.trim() || !admissionStatus.trim() || !scvtRegistrationNumber.trim())) {
      showToast({
        kind: "error",
        title: "SCVT details required",
        message: "Ent roll, admission status, and SCVT registration are required for verified status."
      });
      return;
    }

    const response = await fetch(`/api/students/${row.student.id}/prn-scvt`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entRollNumber: entRollNumber.trim() || null,
        admissionStatus: admissionStatus.trim() || null,
        scvtRegistrationNumber: scvtRegistrationNumber.trim() || null,
        verificationStatus: nextStatus,
        remark: remark.trim() || null
      })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      showToast({ kind: "error", title: "SCVT not updated", message: result?.message || "Unable to update SCVT record." });
      return;
    }
    showToast({ kind: "success", title: "SCVT updated", message: `${row.student.fullName} marked ${nextStatus}.` });
    setRefreshKey((current) => current + 1);
  }

  return (
    <div className="space-y-6">
      <section className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">SCVT Lifecycle Desk</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">SCVT Registration Queue</h3>
            <p className="mt-1 text-sm text-slate-600">Review registration fields and control SCVT verification status.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="chip-warning">Pending: {counts.PENDING || 0}</span>
            <span className="chip-success">Verified: {counts.VERIFIED || 0}</span>
            <span className="chip-danger">Rejected: {counts.REJECTED || 0}</span>
            <span className="chip-neutral">Incomplete: {counts.INCOMPLETE || 0}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-4">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
            placeholder="Search by student name / code / mobile"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={verificationStatus}
            onChange={(event) => setVerificationStatus(event.target.value)}
          >
            <option value="">All Status</option>
            {verificationOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
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
          <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800" type="button" onClick={() => setRefreshKey((current) => current + 1)}>
            Apply Filters
          </button>
        </div>

        <div className="mt-4 data-table-wrap rounded-2xl border border-slate-100 bg-white">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>SCVT Details</th>
                <th>Status</th>
                <th>Remark</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                    Loading SCVT queue...
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
                    </td>
                    <td>{row.verificationStatus}</td>
                    <td className="max-w-[260px] text-xs text-slate-600">{row.remark || "-"}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800" onClick={() => void updateRow(row, "VERIFIED")} type="button">
                          Verify
                        </button>
                        <button className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800" onClick={() => void updateRow(row, "INCOMPLETE")} type="button">
                          Incomplete
                        </button>
                        <button className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800" onClick={() => void updateRow(row, "REJECTED")} type="button">
                          Reject
                        </button>
                        <button className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700" onClick={() => void updateRow(row, "PENDING")} type="button">
                          Pending
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                    No SCVT records found for current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <OcrImportDesk moduleSlug="scvt" />
    </div>
  );
}
