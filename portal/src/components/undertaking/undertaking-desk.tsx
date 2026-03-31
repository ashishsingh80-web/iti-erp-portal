"use client";

import { useState } from "react";
import Link from "next/link";
import type { StudentDirectoryRow } from "@/lib/types";
import { showToast } from "@/lib/toast";

export function UndertakingDesk() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<StudentDirectoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function runSearch() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    const response = await fetch(`/api/students?${params.toString()}`);
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      showToast({ kind: "error", title: "Undertaking list failed", message: result?.message || "Unable to load students." });
      setLoading(false);
      return;
    }
    setRows(Array.isArray(result.rows) ? result.rows : []);
    setLoading(false);
  }

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow-compact">Undertaking Desk</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Print Undertakings</h3>
          <p className="mt-2 text-sm text-slate-600">Search students here and open the undertaking print page directly from the Undertaking module.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
        <input
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          placeholder="Search student name, code, or mobile"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button className="btn-primary" onClick={() => void runSearch()} type="button">
          {loading ? "Loading..." : "Search Students"}
        </button>
      </div>

      <div className="mt-6 data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Institute</th>
              <th>Trade</th>
              <th>Print</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.studentCode} • {row.fullName}</td>
                  <td>{row.instituteName}</td>
                  <td>{row.tradeName}</td>
                  <td>
                    <Link className="btn-secondary" href={`/undertakings/${row.id}`} target="_blank">
                      Print Undertaking
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="data-table-empty" colSpan={4}>
                  Search students to print undertaking forms.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
