"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { formatInr } from "@/lib/currency";
import { showToast } from "@/lib/toast";

type ClearanceRow = {
  department: string;
  label: string;
  isCleared: boolean;
  clearanceDate: string;
  remark: string;
  approvedBy: string;
  blockedByInventory?: boolean;
};

type NoDuesRow = {
  id: string;
  studentCode: string;
  fullName: string;
  instituteName: string;
  tradeName: string;
  session: string;
  yearLabel: string;
  dueAmount: string;
  paymentStatus: string;
  pendingDepartments: number;
  readyForRelease: boolean;
  clearances: ClearanceRow[];
};

export function NoDuesDesk() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<NoDuesRow[]>([]);

  async function loadRows(nextSearch = search) {
    setLoading(true);
    const params = new URLSearchParams();
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    const response = await fetch(`/api/students/no-dues?${params.toString()}`);
    const result = await response.json();
    setRows(result.rows || []);
    setLoading(false);
  }

  useEffect(() => {
    void loadRows();
  }, []);

  async function saveRow(row: NoDuesRow) {
    const response = await fetch("/api/students/no-dues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: row.id,
        clearances: row.clearances.map((item) => ({
          department: item.department,
          isCleared: item.isCleared,
          clearanceDate: item.clearanceDate,
          remark: item.remark
        }))
      })
    });
    const result = await response.json();

    if (!response.ok) {
      showToast({ kind: "error", title: "No dues not saved", message: result?.message || "Unable to save no dues" });
      return;
    }

    showToast({ kind: "success", title: "No dues saved", message: `${result.student?.studentCode || "Student"} updated.` });
    await loadRows();
  }

  const readyCount = useMemo(() => rows.filter((item) => item.readyForRelease).length, [rows]);
  const pendingCount = useMemo(() => rows.filter((item) => !item.readyForRelease).length, [rows]);

  return (
    <div className="grid gap-6">
      <section className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">No Dues</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Department Clearance Desk</h3>
            <p className="mt-2 text-sm text-slate-600">Clear students department-wise for accounts, workshop, store, library, documents, and ID card. This is the next blueprint step after master control.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="chip-success">{readyCount} ready</span>
            <span className="chip-warning">{pendingCount} pending</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
          <Input label="Search Student" placeholder="Student name, code, mobile" value={search} onChange={(event) => setSearch(event.target.value)} />
          <div className="flex items-end gap-3">
            <button className="btn-secondary" onClick={() => void loadRows(search)} type="button">
              Apply
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-40" />
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <article key={row.id} className="surface p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-lg font-semibold text-slate-900">{row.fullName}</h4>
                    <StatusBadge status={row.readyForRelease ? "READY" : "PENDING"} />
                    <StatusBadge status={row.paymentStatus} prefix="Fees" />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {row.studentCode} • {row.instituteName} • {row.tradeName} • {row.session} / {row.yearLabel}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">Fee due: {formatInr(row.dueAmount)} • Pending departments: {row.pendingDepartments}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a className="btn-secondary" href={`/students/${row.id}`}>
                    Open Student
                  </a>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {row.clearances.map((clearance) => (
                  <div key={clearance.department} className="rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{clearance.label}</p>
                        {clearance.approvedBy ? <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">Approved by {clearance.approvedBy}</p> : null}
                      </div>
                      <ToggleSwitch
                        checked={clearance.isCleared}
                        label={clearance.isCleared ? "Cleared" : "Pending"}
                        disabled={clearance.blockedByInventory}
                        onChange={(nextValue) =>
                          setRows((current) =>
                            current.map((item) =>
                              item.id === row.id
                                ? {
                                    ...item,
                                    clearances: item.clearances.map((entry) =>
                                      entry.department === clearance.department
                                        ? {
                                            ...entry,
                                            isCleared: nextValue,
                                            clearanceDate: nextValue ? entry.clearanceDate || new Date().toISOString().slice(0, 10) : ""
                                          }
                                        : entry
                                    )
                                  }
                                : item
                            )
                          )
                        }
                        variant={clearance.isCleared ? "success" : "neutral"}
                      />
                    </div>
                    {clearance.blockedByInventory ? (
                      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                        Auto-blocked: pending issued items exist in inventory. Return them from the Inventory module first.
                      </p>
                    ) : null}
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <Input
                        label="Clearance Date"
                        type="date"
                        disabled={clearance.blockedByInventory}
                        value={clearance.clearanceDate}
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((item) =>
                              item.id === row.id
                                ? {
                                    ...item,
                                    clearances: item.clearances.map((entry) =>
                                      entry.department === clearance.department ? { ...entry, clearanceDate: event.target.value } : entry
                                    )
                                  }
                                : item
                            )
                          )
                        }
                      />
                      <Input
                        label="Remark"
                        helperText="Optional"
                        disabled={clearance.blockedByInventory}
                        value={clearance.remark}
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((item) =>
                              item.id === row.id
                                ? {
                                    ...item,
                                    clearances: item.clearances.map((entry) =>
                                      entry.department === clearance.department ? { ...entry, remark: event.target.value } : entry
                                    )
                                  }
                                : item
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex justify-end">
                <button className="btn-primary" onClick={() => void saveRow(row)} type="button">
                  Save No Dues
                </button>
              </div>
            </article>
          ))}

          {!rows.length ? (
            <section className="surface p-10 text-center text-sm text-slate-500">
              No students found for current no-dues filters.
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
