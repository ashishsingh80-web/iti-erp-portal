"use client";

import { useState } from "react";
import { showToast } from "@/lib/toast";

const templateHeaders = [
  "fullName",
  "fatherName",
  "motherName",
  "mobile",
  "alternateMobile",
  "email",
  "dateOfBirth",
  "instituteCode",
  "tradeCode",
  "session",
  "yearLabel",
  "unitNumber",
  "admissionDate",
  "admissionType",
  "admissionStatus",
  "seatType",
  "rollNumber",
  "batch",
  "shift",
  "category",
  "caste",
  "religion",
  "address",
  "schoolName",
  "board",
  "certificateNumber",
  "passingYear",
  "percentage"
];

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

type PreviewRow = {
  rowNumber: number;
  fullName: string;
  instituteCode: string;
  tradeName: string;
  session: string;
  yearLabel: string;
  unitNumber: number;
  mobile: string;
  canImport: boolean;
  problems: string[];
};

export function AdmissionBulkImport() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    totalRows: number;
    importableCount: number;
    blockedCount?: number;
    rows: PreviewRow[];
  } | null>(null);

  function downloadTemplate() {
    const sampleRow = [
      "RAVI KUMAR",
      "MAHESH KUMAR",
      "SUNITA DEVI",
      "9876543210",
      "",
      "",
      "15/08/2008",
      "ITI01",
      "EL",
      "2026-27",
      "1st",
      "1",
      "2026-07-15",
      "DIRECT",
      "REGISTERED",
      "REGULAR",
      "",
      "A",
      "Morning",
      "OBC",
      "OBC",
      "HINDU",
      "Village Example, District Example",
      "ABC Inter College",
      "UP Board",
      "X-2026-001",
      "2026",
      "71.2"
    ];
    const csv = [templateHeaders.map(escapeCsv).join(","), sampleRow.map(escapeCsv).join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "admissions-bulk-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function previewImport() {
    if (!file) {
      showToast({ kind: "error", title: "File required", message: "Choose the admissions CSV first." });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "preview");

      const response = await fetch("/api/admissions/import", {
        method: "POST",
        body: formData
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || "Unable to preview import");
      }

      setPreview(result);
      showToast({
        kind: "success",
        title: "Import preview ready",
        message: `${result.importableCount} rows can be imported.`
      });
    } catch (error) {
      showToast({
        kind: "error",
        title: "Preview failed",
        message: error instanceof Error ? error.message : "Unable to preview admissions import"
      });
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "import");

      const response = await fetch("/api/admissions/import", {
        method: "POST",
        body: formData
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || "Unable to import admissions");
      }

      showToast({
        kind: "success",
        title: "Admissions imported",
        message: `${result.importedCount} admissions created successfully.`
      });
      setPreview(null);
      setFile(null);
      window.location.reload();
    } catch (error) {
      showToast({
        kind: "error",
        title: "Import failed",
        message: error instanceof Error ? error.message : "Unable to import admissions"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow-compact">Bulk Import</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Admission Bulk Upload</h3>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Upload a CSV, preview valid and blocked rows, then import only after checking duplicate warnings.
          </p>
        </div>
        <button className="btn-secondary" onClick={downloadTemplate} type="button">
          Download CSV Template
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Admissions CSV
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </label>
        <button className="btn-primary self-end" disabled={loading} onClick={() => void previewImport()} type="button">
          {loading ? "Working..." : "Preview Import"}
        </button>
        <button className="btn-dark self-end" disabled={loading || !preview?.importableCount} onClick={() => void confirmImport()} type="button">
          Import Valid Rows
        </button>
      </div>

      {preview ? (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total Rows</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{preview.totalRows}</p>
            </div>
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Importable</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">{preview.importableCount}</p>
            </div>
            <div className="rounded-3xl border border-amber-100 bg-amber-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Blocked</p>
              <p className="mt-2 text-2xl font-semibold text-amber-900">{preview.rows.filter((item) => !item.canImport).length}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">Row</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">Student</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">Institute / Trade</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">Session / Year</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]">Problems</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={`${row.rowNumber}-${row.fullName}`} className="border-t border-slate-100">
                    <td className="px-4 py-3">{row.rowNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{row.fullName}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.mobile}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{row.instituteCode || "-"}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.tradeName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{row.session}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.yearLabel} • Unit {row.unitNumber || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.12em] ${row.canImport ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {row.canImport ? "READY" : "BLOCKED"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.problems.length ? row.problems.join(", ") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
