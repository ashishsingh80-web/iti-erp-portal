"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatInr } from "@/lib/currency";
import { fetchJsonSafe } from "@/lib/fetch-json";
import type { StudentDirectoryRow } from "@/lib/types";
import { showToast } from "@/lib/toast";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

export function FeeCollectionDesk() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<StudentDirectoryRow[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [payerType, setPayerType] = useState("STUDENT");
  const [agentCode, setAgentCode] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [referenceNo, setReferenceNo] = useState("");
  const [remark, setRemark] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentReceipts, setRecentReceipts] = useState<Array<{ studentId: string; transactionId: string; receiptNo: string }>>([]);
  const selectedEntries = useMemo(
    () => Object.entries(selected).filter(([, amount]) => Number(amount) > 0),
    [selected]
  );
  const selectedCount = selectedEntries.length;
  const selectedTotal = useMemo(
    () => selectedEntries.reduce((sum, [, amount]) => sum + Number(amount || 0), 0),
    [selectedEntries]
  );

  async function runSearch() {
    setError("");
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    const response = await fetch(`/api/students?${params.toString()}`);
    const result = await fetchJsonSafe<any>(response);

    if (!response.ok) {
      const nextError = result?.message || "Unable to search students";
      setError(nextError);
      showToast({ kind: "error", title: "Student search failed", message: nextError });
      return;
    }

    setRows(result.rows || []);
  }

  function toggleStudent(studentId: string) {
    setSelected((current) => {
      if (studentId in current) {
        const next = { ...current };
        delete next[studentId];
        return next;
      }

      return { ...current, [studentId]: "" };
    });
  }

  async function collectFees() {
    setError("");
    setMessage("");

    const dueByStudent = new Map(rows.map((row) => [row.id, Number(row.dueAmount || 0)]));
    const invalidAmount = Object.entries(selected).find(([studentId, amount]) => {
      const numeric = Number(amount);
      if (!Number.isFinite(numeric) || numeric <= 0) return true;
      const due = dueByStudent.get(studentId) || 0;
      return numeric > due + 0.001;
    });
    if (invalidAmount) {
      const nextError = "Amount must be greater than 0 and not more than current due";
      setError(nextError);
      showToast({ kind: "error", title: "Fee not collected", message: nextError });
      return;
    }

    const items = Object.entries(selected)
      .filter(([, amount]) => Number(amount) > 0)
      .map(([studentId, amountPaid]) => ({ studentId, amountPaid }));

    if (!items.length) {
      const nextError = "Select at least one student and enter amount";
      setError(nextError);
      showToast({ kind: "error", title: "Fee not collected", message: nextError });
      return;
    }

    setLoading(true);
    const response = await fetch("/api/fees/collect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items,
        payerType,
        agentCode,
        paymentMode,
        referenceNo,
        remark,
        transactionDate,
        idempotencyKey: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      })
    });

    const result = await fetchJsonSafe<any>(response);
    setLoading(false);

    if (!response.ok) {
      const nextError = result?.message || "Unable to collect fees";
      setError(nextError);
      showToast({ kind: "error", title: "Fee collection failed", message: nextError });
      return;
    }

    setSelected({});
    setRecentReceipts(Array.isArray(result.receipts) ? result.receipts : []);
    setMessage(
      result.allocationGroup
        ? `Bulk fee collected for ${result.processed} students. Group ${result.allocationGroup}`
        : `Fee collected for ${result.processed} student`
    );
    showToast({
      kind: "success",
      title: "Fee collected",
      message: result.allocationGroup ? `Processed ${result.processed} students` : `Processed ${result.processed} student`
    });
    await runSearch();
  }

  return (
    <section className="surface p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Fees Module</p>
        <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Fee Collection Desk</h3>
        <p className="mt-2 text-sm text-slate-600">
          Search students, select one or many, and collect student-wise or bulk fees with student or agent as payer.
        </p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-6">
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm xl:col-span-2" placeholder="Search student name, code, or mobile" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={payerType} onChange={(event) => setPayerType(event.target.value)}>
          <option value="STUDENT">Student</option>
          <option value="AGENT">Agent</option>
        </select>
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Agent code if agent payment" value={agentCode} onChange={(event) => setAgentCode(event.target.value)} />
        <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="ONLINE">Online/Cheque</option>
        </select>
        <button className="rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white" onClick={() => void runSearch()} type="button">
          Search Students
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Reference number" value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Remark" value={remark} onChange={(event) => setRemark(event.target.value)} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} />
      </div>

      {(message || error) ? (
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {error || message}
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-100">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Select</th>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Institute</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium">Amount to Collect</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => {
                const checked = row.id in selected;
                return (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <ToggleSwitch checked={checked} compact onChange={() => toggleStudent(row.id)} variant="neutral" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{row.studentCode} • {row.fullName}</div>
                      <div className="text-xs text-slate-500">{row.tradeName}</div>
                    </td>
                    <td className="px-4 py-3">{row.instituteName}</td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3">{formatInr(row.dueAmount)}</td>
                    <td className="px-4 py-3">
                      <input
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                        disabled={!checked}
                        placeholder="0"
                        value={selected[row.id] || ""}
                        onChange={(event) => setSelected((current) => ({ ...current, [row.id]: event.target.value }))}
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="border-t border-slate-100">
                <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                  Search students to start fee collection
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-3 z-20 mt-5 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Selection</p>
            <p className="text-sm font-semibold text-slate-900">
              {selectedCount} student{selectedCount === 1 ? "" : "s"} • {formatInr(selectedTotal)}
            </p>
          </div>
          <button
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
            disabled={loading || selectedCount === 0}
            onClick={() => void collectFees()}
            type="button"
          >
            {loading ? "Collecting..." : "Collect Fee"}
          </button>
        </div>
      </div>

      {recentReceipts.length ? (
        <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow-compact">Recent Receipts</p>
              <h4 className="mt-2 text-xl font-semibold text-slate-900">Print Fee Receipts</h4>
            </div>
            <span className="chip-success">{recentReceipts.length} ready</span>
          </div>
          <div className="mt-4 data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt No</th>
                  <th>Student</th>
                  <th>Print</th>
                </tr>
              </thead>
              <tbody>
                {recentReceipts.map((item) => {
                  const student = rows.find((row) => row.id === item.studentId);
                  return (
                    <tr key={item.transactionId}>
                      <td>{item.receiptNo}</td>
                      <td>{student ? `${student.studentCode} • ${student.fullName}` : item.studentId}</td>
                      <td>
                        <Link className="btn-secondary" href={`/receipts/${item.transactionId}`} target="_blank">
                          Print Receipt
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
