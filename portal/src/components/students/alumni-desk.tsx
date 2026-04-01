"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/lib/toast";

type AlumniRow = {
  id: string;
  studentCode: string;
  fullName: string;
  instituteName: string;
  tradeName: string;
  session: string;
  yearLabel: string;
  status: string;
};

export function AlumniDesk() {
  const [rows, setRows] = useState<AlumniRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState("");

  async function loadRows() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/students/alumni");
    const result = await response.json();
    if (!response.ok) {
      setRows([]);
      setError(result?.message || "Unable to load alumni candidates");
      setLoading(false);
      return;
    }
    setRows(Array.isArray(result.rows) ? result.rows : []);
    setLoading(false);
  }

  async function moveToAlumni(studentId: string) {
    setProcessingId(studentId);
    const response = await fetch("/api/students/alumni", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId })
    });
    const result = await response.json();
    if (!response.ok) {
      showToast({ kind: "error", title: "Alumni move failed", message: result?.message || "Unable to move student to alumni" });
      setProcessingId("");
      return;
    }
    showToast({ kind: "success", title: "Student sent to alumni", message: result.student?.studentCode || "" });
    await loadRows();
    setProcessingId("");
  }

  useEffect(() => {
    void loadRows();
  }, []);

  return (
    <section className="surface p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow-compact">Alumni Desk</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Send 2nd Year Students To Alumni</h3>
          <p className="mt-2 text-sm text-slate-600">Complete 2nd year lifecycle and move students into alumni records.</p>
        </div>
        <span className="chip-neutral">{rows.length} candidates</span>
      </div>
      {error ? <p className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Institute</th>
              <th className="px-3 py-2">Trade</th>
              <th className="px-3 py-2">Session</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 text-sm">
                <td className="px-3 py-3">
                  <p className="font-semibold text-slate-900">{row.fullName}</p>
                  <p className="text-slate-500">{row.studentCode}</p>
                </td>
                <td className="px-3 py-3 text-slate-700">{row.instituteName}</td>
                <td className="px-3 py-3 text-slate-700">{row.tradeName}</td>
                <td className="px-3 py-3 text-slate-700">{row.session} / {row.yearLabel}</td>
                <td className="px-3 py-3">
                  <button
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={processingId === row.id}
                    onClick={() => void moveToAlumni(row.id)}
                    type="button"
                  >
                    {processingId === row.id ? "Sending..." : "Send To Alumni"}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && !rows.length ? (
              <tr>
                <td className="px-3 py-6 text-sm text-slate-500" colSpan={5}>
                  No alumni candidates found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
