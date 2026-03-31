"use client";

import { useState } from "react";
import { showToast } from "@/lib/toast";

const templateHeaders = [
  "studentCode",
  "fullName",
  "fatherName",
  "motherName",
  "mobile",
  "email",
  "instituteCode",
  "tradeName",
  "yearLabel",
  "unitNumber",
  "category",
  "address",
  "scholarshipId",
  "scholarshipStatus",
  "creditedAmount",
  "approvedDate",
  "creditDate",
  "prnNumber",
  "scvtRegistrationNumber",
  "registrationDate"
];

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function HistoricalUploadDesk() {
  const [file, setFile] = useState<File | null>(null);
  const [session, setSession] = useState("");
  const [yearLabel, setYearLabel] = useState("1st");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState<{ importedCount: number; skippedCount: number; imported: string[]; skipped: string[] } | null>(null);

  function downloadTemplate() {
    const sampleRow = [
      "",
      "RAVI KUMAR",
      "MAHESH KUMAR",
      "SUNITA DEVI",
      "9876543210",
      "",
      "ITI01",
      "Electrician",
      "1st",
      "1",
      "OBC",
      "Village Example, District Example",
      "SCH-2025-001",
      "APPROVED",
      "12000",
      "2025-08-12",
      "2025-10-04",
      "PRN250001",
      "SCVT250001",
      "2025-07-30"
    ];
    const csv = [templateHeaders.map(escapeCsv).join(","), sampleRow.map(escapeCsv).join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "historical-students-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importHistoricalStudents() {
    if (!file) {
      setMessage("Choose the CSV file first.");
      return;
    }

    if (!session.trim()) {
      setMessage("Session is required.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("session", session.trim());
      formData.append("yearLabel", yearLabel);

      const response = await fetch("/api/students/historical-import", {
        method: "POST",
        body: formData
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Unable to import old session students");
      }

      setSummary(result);
      setMessage(`${result.importedCount || 0} old-session students imported.`);
      showToast({
        kind: "success",
        title: "Historical records imported",
        message: `${result.importedCount || 0} students added for session ${session}.`
      });
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Unable to import old session students";
      setMessage(nextMessage);
      showToast({ kind: "error", title: "Historical import failed", message: nextMessage });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow-compact">Historical Record Upload</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Old Session Student Upload</h3>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Upload old-session students session-wise for institute record. Imported students are saved as completed historical records so they do not appear as pending current work.
          </p>
        </div>
        <button className="btn-secondary" onClick={downloadTemplate} type="button">
          Download CSV Template
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Session
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Example: 2024-26 or 2025-27" value={session} onChange={(event) => setSession(event.target.value)} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Default Year
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={yearLabel} onChange={(event) => setYearLabel(event.target.value)}>
            <option value="1st">1st Year</option>
            <option value="2nd">2nd Year</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          CSV File
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="file" accept=".csv" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button className="btn-primary" disabled={loading} onClick={() => void importHistoricalStudents()} type="button">
          {loading ? "Uploading..." : "Upload Historical Session"}
        </button>
      </div>

      {message ? <p className="mt-4 text-sm text-slate-600">{message}</p> : null}

      {summary ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="text-sm font-semibold text-emerald-900">Imported</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-900">{summary.importedCount}</p>
            <div className="mt-3 space-y-2 text-sm text-emerald-900">
              {summary.imported.slice(0, 8).map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-4">
            <p className="text-sm font-semibold text-amber-900">Skipped</p>
            <p className="mt-1 text-2xl font-semibold text-amber-900">{summary.skippedCount}</p>
            <div className="mt-3 space-y-2 text-sm text-amber-900">
              {summary.skipped.slice(0, 8).map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
