"use client";

import { useEffect, useState } from "react";
import { formatInr } from "@/lib/currency";
import { showToast } from "@/lib/toast";

type ArchiveRow = {
  id: string;
  studentCode: string;
  fullName: string;
  instituteName: string;
  tradeName: string;
  session: string;
  yearLabel: string;
  archiveCategory: string | null;
  archiveNote: string | null;
  lifecycleStage: string;
  feeDueAmount: string;
  scholarshipStatus: string;
  paymentStatus: string;
  legalPriority: boolean;
};

export function StudentArchiveDesk() {
  const [rows, setRows] = useState<ArchiveRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [category, setCategory] = useState("SUSPECTED");
  const [note, setNote] = useState("");

  async function loadRows() {
    const response = await fetch("/api/students/archive");
    const result = await response.json();
    setRows(result.rows || []);
    if (!selectedStudentId && result.rows?.[0]?.id) {
      setSelectedStudentId(result.rows[0].id);
    }
  }

  async function archiveCase() {
    const response = await fetch("/api/students/archive", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: selectedStudentId, category, note })
    });
    const result = await response.json();
    if (!response.ok) {
      showToast({ kind: "error", title: "Archive case not saved", message: result?.message || "Unable to update archive case" });
      return;
    }
    showToast({ kind: "success", title: "Archive case saved", message: result.student?.studentCode || "" });
    setNote("");
    await loadRows();
  }

  useEffect(() => {
    void loadRows();
  }, []);

  const priorityRows = rows.filter((row) => row.legalPriority);

  return (
    <div className="grid gap-6">
      {priorityRows.length ? (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
          <p className="eyebrow-compact text-rose-700">Highest Priority Legal Warning</p>
          <h3 className="mt-2 text-2xl font-semibold text-rose-900">Scholarship taken and fees still due</h3>
          <p className="mt-2 text-sm text-rose-800">
            These students have scholarship linked records and still show fee due. Institute should review legal action priority immediately.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {priorityRows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm">
                <p className="font-semibold text-slate-900">{row.fullName}</p>
                <p className="mt-1 text-slate-600">{row.studentCode} • {row.tradeName} • Due {formatInr(row.feeDueAmount)}</p>
                <p className="mt-1 text-rose-700">Scholarship: {row.scholarshipStatus}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="surface p-6">
        <div>
          <p className="eyebrow-compact">Student Archive</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Archive Suspected / Inactive Students</h3>
          <p className="mt-2 text-sm text-slate-600">Mark students as suspected when they are not contacting the institute, or inactive when they have left the institute.</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
            <option value="">Select student</option>
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.studentCode} • {row.fullName}
              </option>
            ))}
          </select>
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="SUSPECTED">Suspected Student</option>
            <option value="INACTIVE_LEFT">Inactive Student</option>
          </select>
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Archive note" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <button className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" disabled={!selectedStudentId} onClick={() => void archiveCase()} type="button">
          Save Archive Status
        </button>
      </section>

      <section className="surface p-6">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Lifecycle</th>
                <th className="px-3 py-2">Archive Type</th>
                <th className="px-3 py-2">Fee Due</th>
                <th className="px-3 py-2">Scholarship</th>
                <th className="px-3 py-2">Warning</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 text-sm">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-900">{row.fullName}</p>
                    <p className="text-slate-500">{row.studentCode} • {row.tradeName}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{row.lifecycleStage}</td>
                  <td className="px-3 py-3 text-slate-700">{row.archiveCategory || "-"}</td>
                  <td className="px-3 py-3 text-slate-700">{formatInr(row.feeDueAmount)}</td>
                  <td className="px-3 py-3 text-slate-700">{row.scholarshipStatus}</td>
                  <td className="px-3 py-3">
                    {row.legalPriority ? <span className="chip-warning">Legal priority</span> : <span className="chip-neutral">Normal</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
