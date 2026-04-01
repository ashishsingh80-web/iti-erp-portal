"use client";

import { useMemo, useState } from "react";
import { formatInr } from "@/lib/currency";
import { showToast } from "@/lib/toast";

type ImportKind = "SCHOLARSHIP" | "PRN" | "SCVT";

type PreviewRow = {
  studentId: string;
  studentCode: string;
  fullName: string;
  session: string;
  yearLabel: string;
  tradeName: string;
  matchedBy: string;
  confidence: number;
  canApply: boolean;
  extractedValue: string;
  currentValue: string;
  extractedStatus: string;
  currentStatus: string;
  creditedAmount: string;
  lineText: string;
};

type PreviewPayload = {
  kind: ImportKind;
  sourceName: string;
  detectedFilters?: {
    instituteCode?: string;
    instituteName?: string;
    instituteScvtCode?: string;
    tradeName?: string;
  };
  rows: PreviewRow[];
  summary: {
    parsedLines: number;
    matchedRows: number;
    readyToApply: number;
  };
};

type OcrImportDeskProps = {
  moduleSlug: "scholarship" | "scvt" | "prn";
};

const yearOptions = [
  { label: "All Years", value: "" },
  { label: "1st Year", value: "1st" },
  { label: "2nd Year", value: "2nd" }
];

export function OcrImportDesk({ moduleSlug }: OcrImportDeskProps) {
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<ImportKind>(
    moduleSlug === "scholarship" ? "SCHOLARSHIP" : moduleSlug === "scvt" ? "SCVT" : "PRN"
  );
  const [session, setSession] = useState("");
  const [yearLabel, setYearLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [message, setMessage] = useState("");

  const kindOptions = useMemo(
    () =>
      moduleSlug === "scholarship"
        ? [{ label: "Scholarship PDF", value: "SCHOLARSHIP" as const }]
        : moduleSlug === "scvt"
          ? [{ label: "SCVT PDF", value: "SCVT" as const }]
          : [
            { label: "PRN PDF", value: "PRN" as const },
          ],
    [moduleSlug]
  );

  async function analyzePdf() {
    if (!file) {
      setMessage("Choose the PDF first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const formData = new FormData();
      formData.append("mode", "preview");
      formData.append("kind", kind);
      formData.append("file", file);
      if (session) formData.append("session", session);
      if (yearLabel) formData.append("yearLabel", yearLabel);

      const response = await fetch("/api/ocr-imports", {
        method: "POST",
        body: formData
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Unable to analyze PDF");
      }

      setPreview(result.preview || null);
      showToast({
        kind: "success",
        title: "PDF analyzed",
        message: `${result.preview?.summary?.matchedRows || 0} student rows matched.`
      });
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Unable to analyze PDF";
      setMessage(nextMessage);
      showToast({ kind: "error", title: "Import analysis failed", message: nextMessage });
    } finally {
      setLoading(false);
    }
  }

  async function applyImport() {
    if (!preview) {
      setMessage("Analyze the PDF first.");
      return;
    }
    if (!file) {
      setMessage("Choose the same PDF file again before apply.");
      return;
    }

    try {
      setApplying(true);
      setMessage("");
      const formData = new FormData();
      formData.append("mode", "apply");
      formData.append("kind", preview.kind);
      formData.append("file", file);
      if (session) formData.append("session", session);
      if (yearLabel) formData.append("yearLabel", yearLabel);

      const response = await fetch("/api/ocr-imports", {
        method: "POST",
        body: formData
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Unable to apply import");
      }

      showToast({
        kind: "success",
        title: "Import applied",
        message: `${result.appliedRows || 0} students updated successfully.`
      });
      setMessage(`${result.appliedRows || 0} students updated.`);
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Unable to apply import";
      setMessage(nextMessage);
      showToast({ kind: "error", title: "Import not applied", message: nextMessage });
    } finally {
      setApplying(false);
    }
  }

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow-compact">OCR Import Desk</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">
            {moduleSlug === "scholarship"
              ? "Scholarship PDF Import"
              : moduleSlug === "scvt"
                ? "SCVT PDF Import"
                : "PRN PDF Import"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Upload a PDF, preview matched students and extracted registration details, then apply only the confident updates.
          </p>
        </div>
        {preview ? (
          <div className="flex flex-wrap gap-2">
            <span className="chip-neutral">{preview.summary.parsedLines} lines</span>
            <span className="chip-success">{preview.summary.matchedRows} matched</span>
            <span className="chip-warning">{preview.summary.readyToApply} ready</span>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Import Type
          <select
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            disabled={moduleSlug === "scholarship" || moduleSlug === "scvt"}
            value={kind}
            onChange={(event) => setKind(event.target.value as ImportKind)}
          >
            {kindOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Session Filter
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Example: 2026-28" value={session} onChange={(event) => setSession(event.target.value)} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Year Filter
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={yearLabel} onChange={(event) => setYearLabel(event.target.value)}>
            {yearOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Upload PDF
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="file" accept=".pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button className="btn-primary" disabled={loading} onClick={() => void analyzePdf()} type="button">
          {loading ? "Analyzing..." : "Analyze PDF"}
        </button>
        <button className="btn-secondary" disabled={!preview || applying} onClick={() => void applyImport()} type="button">
          {applying ? "Applying..." : "Apply Confident Updates"}
        </button>
      </div>

      {message ? <p className="mt-4 text-sm text-slate-600">{message}</p> : null}

      {preview?.detectedFilters ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {preview.detectedFilters.instituteName ? (
            <span className="chip-neutral">Institute: {preview.detectedFilters.instituteName}</span>
          ) : null}
          {preview.detectedFilters.instituteScvtCode ? (
            <span className="chip-neutral">SCVT Code: {preview.detectedFilters.instituteScvtCode}</span>
          ) : null}
          {preview.detectedFilters.instituteCode ? (
            <span className="chip-success">Mapped Institute: {preview.detectedFilters.instituteCode}</span>
          ) : null}
          {preview.detectedFilters.tradeName ? (
            <span className="chip-warning">Trade: {preview.detectedFilters.tradeName}</span>
          ) : null}
        </div>
      ) : null}

      {preview ? (
        <div className="mt-6 data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Match</th>
                <th>Current</th>
                <th>Extracted</th>
                <th>Status</th>
                <th>Apply</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.length ? (
                preview.rows.map((row) => (
                  <tr key={`${row.studentId}-${row.extractedValue}-${row.extractedStatus}`}>
                    <td>
                      <div>
                        <p className="font-semibold text-slate-900">{row.fullName}</p>
                        <p className="text-xs text-slate-500">
                          {row.studentCode} • {row.tradeName} • {row.session} • {row.yearLabel}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{row.matchedBy}</p>
                        <p className="text-xs text-slate-500">Confidence {(row.confidence * 100).toFixed(0)}%</p>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="text-sm text-slate-800">{row.currentValue || "-"}</p>
                        <p className="text-xs text-slate-500">{row.currentStatus || "-"}</p>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{row.extractedValue || "-"}</p>
                        {row.creditedAmount ? <p className="text-xs text-slate-500">Credited {formatInr(row.creditedAmount)}</p> : null}
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="text-sm text-slate-800">{row.extractedStatus || "-"}</p>
                        <p className="max-w-[260px] truncate text-xs text-slate-500" title={row.lineText}>
                          {row.lineText}
                        </p>
                      </div>
                    </td>
                    <td>{row.canApply ? <span className="chip-success">Ready</span> : <span className="chip-warning">Review</span>}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="data-table-empty" colSpan={6}>
                    No confident student matches found in this PDF.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
