"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/lib/toast";

type PromotionRow = {
  id: string;
  studentCode: string;
  fullName: string;
  instituteName: string;
  tradeName: string;
  currentSession: string;
  nextSession: string;
  currentYear: string;
};

export function PromotionDesk() {
  const [rows, setRows] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRows() {
    setLoading(true);
    const response = await fetch("/api/students/promotions");
    const result = await response.json();
    setRows(result.rows || []);
    setLoading(false);
  }

  async function promote(studentId: string) {
    const response = await fetch("/api/students/promotions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId })
    });
    const result = await response.json();
    if (!response.ok) {
      showToast({ kind: "error", title: "Promotion not completed", message: result?.message || "Unable to promote student" });
      return;
    }
    showToast({ kind: "success", title: "Student promoted", message: result.student?.studentCode || "" });
    await loadRows();
  }

  useEffect(() => {
    void loadRows();
  }, []);

  return (
    <section className="surface p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow-compact">Promotion Desk</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Promote 1st Year To 2nd Year</h3>
          <p className="mt-2 text-sm text-slate-600">Move current 1st year students into next-session 2nd year records for 2-year trades.</p>
        </div>
        <span className="chip-success">{rows.length} eligible</span>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Institute</th>
              <th className="px-3 py-2">Trade</th>
              <th className="px-3 py-2">Current</th>
              <th className="px-3 py-2">Next Session</th>
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
                <td className="px-3 py-3 text-slate-700">{row.currentSession} / {row.currentYear}</td>
                <td className="px-3 py-3 text-slate-700">{row.nextSession} / 2nd</td>
                <td className="px-3 py-3">
                  <button className="rounded-xl bg-emerald-800 px-3 py-2 text-xs font-semibold text-white" onClick={() => void promote(row.id)} type="button">
                    Promote
                  </button>
                </td>
              </tr>
            ))}
            {!loading && !rows.length ? (
              <tr>
                <td className="px-3 py-6 text-sm text-slate-500" colSpan={6}>
                  No promotion candidates found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
