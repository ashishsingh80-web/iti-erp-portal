"use client";

import { useEffect, useRef, useState } from "react";
import { formatInr } from "@/lib/currency";
import { fetchJsonSafe } from "@/lib/fetch-json";
import type { SelectOption, StudentDirectoryRow } from "@/lib/types";
import { showToast } from "@/lib/toast";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

type AgentCollectionRow = {
  id: string;
  voucherNo: string;
  agentCode: string;
  agentName: string;
  collectionDate: string;
  totalAmount: string;
  allocatedAmount: string;
  unallocatedAmount: string;
  paymentMode: string;
  referenceNo: string | null;
  remark: string | null;
  allocations: Array<{
    id: string;
    studentId: string;
    studentCode: string;
    studentName: string;
    amountAllocated: string;
  }>;
};

export function AgentLedgerPanel({
  initialFilters
}: {
  initialFilters?: {
    agentCode?: string;
    search?: string;
    session?: string;
    yearLabel?: string;
  };
}) {
  const [agentOptions, setAgentOptions] = useState<SelectOption[]>([]);
  const [paymentModes, setPaymentModes] = useState<SelectOption[]>([]);
  const [sessionOptions, setSessionOptions] = useState<SelectOption[]>([]);
  const [yearOptions, setYearOptions] = useState<SelectOption[]>([]);
  const [search, setSearch] = useState(initialFilters?.search || "");
  const [session, setSession] = useState(initialFilters?.session || "");
  const [yearLabel, setYearLabel] = useState(initialFilters?.yearLabel || "");
  const [rows, setRows] = useState<StudentDirectoryRow[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [collections, setCollections] = useState<AgentCollectionRow[]>([]);
  const [reuseCollectionId, setReuseCollectionId] = useState("");
  const [agentCode, setAgentCode] = useState(initialFilters?.agentCode || "");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [totalAmount, setTotalAmount] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [remark, setRemark] = useState("");
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const hasAutoLoaded = useRef(false);

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!bootstrapping && !hasAutoLoaded.current && initialFilters?.agentCode) {
      hasAutoLoaded.current = true;
      void runSearch();
    }
  }, [bootstrapping, agentCode, initialFilters?.agentCode]);

  async function bootstrap() {
    setBootstrapping(true);
    setError("");

    try {
      const [mastersResponse, collectionsResponse] = await Promise.all([
        fetch("/api/masters"),
        fetch("/api/fees/agent-collections")
      ]);

      const mastersResult = await fetchJsonSafe<any>(mastersResponse);
      const collectionsResult = await fetchJsonSafe<any>(collectionsResponse);

      if (!mastersResponse.ok) {
        throw new Error(mastersResult?.message || "Unable to load agent masters");
      }

      if (!collectionsResponse.ok) {
        throw new Error(collectionsResult?.message || "Unable to load recent agent collections");
      }

      setAgentOptions(mastersResult.agents || []);
      setPaymentModes(mastersResult.paymentModes || []);
      setSessionOptions(mastersResult.sessions || []);
      setYearOptions(mastersResult.years || []);
      setCollections(collectionsResult.rows || []);
      if (!initialFilters?.agentCode && !agentCode && mastersResult.agents?.length) {
        setAgentCode(mastersResult.agents.find((item: SelectOption) => item.value)?.value || "");
      }
    } catch (caughtError) {
      const nextError = caughtError instanceof Error ? caughtError.message : "Unable to load agent ledger";
      setError(nextError);
      showToast({ kind: "error", title: "Agent ledger not loaded", message: nextError });
    } finally {
      setBootstrapping(false);
    }
  }

  async function runSearch() {
    setError("");
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (agentCode) params.set("agentCode", agentCode);
    if (session.trim()) params.set("session", session.trim());
    if (yearLabel) params.set("yearLabel", yearLabel);
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

  function selectVisibleStudents() {
    setSelected((current) => {
      const next = { ...current };
      for (const row of rows) {
        if (!(row.id in next)) {
          next[row.id] = "";
        }
      }
      return next;
    });
  }

  function clearVisibleStudents() {
    setSelected((current) => {
      const next = { ...current };
      for (const row of rows) {
        delete next[row.id];
      }
      return next;
    });
  }

  function distributeEqually() {
    const selectedStudentIds = Object.keys(selected);
    if (!selectedStudentIds.length) {
      setError("Select students first for equal distribution");
      return;
    }

    if (!(enteredTotal > 0)) {
      setError("Enter total collection amount before equal distribution");
      return;
    }

    const totalPaise = Math.round(enteredTotal * 100);
    const basePaise = Math.floor(totalPaise / selectedStudentIds.length);
    let remainingPaise = totalPaise - basePaise * selectedStudentIds.length;

    setSelected(() => {
      const next: Record<string, string> = {};
      for (const studentId of selectedStudentIds) {
        const extraPaise = remainingPaise > 0 ? 1 : 0;
        if (remainingPaise > 0) remainingPaise -= 1;
        next[studentId] = ((basePaise + extraPaise) / 100).toFixed(2);
      }
      return next;
    });
    setError("");
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

  const allocatedTotal = Object.values(selected).reduce((sum, amount) => sum + Number(amount || 0), 0);
  const enteredTotal = Number(totalAmount || 0);
  const remainingAmount = enteredTotal - allocatedTotal;

  async function createCollection() {
    setError("");
    setMessage("");

    const allocations = Object.entries(selected)
      .filter(([, amount]) => Number(amount) > 0)
      .map(([studentId, amountAllocated]) => ({ studentId, amountAllocated }));

    if (!agentCode) {
      setError("Select an agent");
      return;
    }

    if (!session) {
      setError("Select a session");
      return;
    }

    if (!yearLabel) {
      setError("Select a year");
      return;
    }

    if (!(enteredTotal > 0)) {
      setError("Enter a total collection amount");
      return;
    }

    if (allocatedTotal > enteredTotal) {
      setError("Allocated amount cannot be greater than total amount");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/fees/agent-collections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        agentCode,
        totalAmount,
        paymentMode,
        referenceNo,
        remark,
        collectionDate,
        allocations
      })
    });

    const result = await fetchJsonSafe<any>(response);
    setLoading(false);

    if (!response.ok) {
      const nextError = result?.message || "Unable to save agent collection";
      setError(nextError);
      showToast({ kind: "error", title: "Agent collection failed", message: nextError });
      return;
    }

    setSelected({});
    setSearch("");
    setRows([]);
    setTotalAmount("");
    setReferenceNo("");
    setRemark("");
    setMessage("Agent collection saved and allocated successfully");
    showToast({ kind: "success", title: "Agent collection saved", message: `Allocated ${allocations.length} student entries` });
    await bootstrap();
  }

  async function reuseUnallocatedBalance() {
    setError("");
    setMessage("");

    const allocations = Object.entries(selected)
      .filter(([, amount]) => Number(amount) > 0)
      .map(([studentId, amountAllocated]) => ({ studentId, amountAllocated }));

    if (!reuseCollectionId) {
      setError("Choose an existing agent collection with unallocated balance");
      return;
    }

    if (!allocations.length) {
      setError("Select students and allocation amounts first");
      return;
    }

    setLoading(true);
    const response = await fetch(`/api/fees/agent-collections/${reuseCollectionId}/allocate`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ allocations })
    });
    const result = await fetchJsonSafe<any>(response);
    setLoading(false);

    if (!response.ok) {
      const nextError = result?.message || "Unable to reuse unallocated balance";
      setError(nextError);
      showToast({ kind: "error", title: "Unallocated balance not reused", message: nextError });
      return;
    }

    setSelected({});
    setRows([]);
    setSearch("");
    setMessage("Unallocated agent balance allocated successfully");
    showToast({ kind: "success", title: "Unallocated balance reused", message: `Allocated ${allocations.length} student entries` });
    await bootstrap();
  }

  return (
    <section className="surface p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Fees Module</p>
        <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Agent Ledger Desk</h3>
        <p className="mt-2 text-sm text-slate-600">
          Record one agent deposit, allocate it student-wise, and keep the remaining unallocated balance visible.
        </p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-6">
        <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm xl:col-span-2" value={agentCode} onChange={(event) => setAgentCode(event.target.value)}>
          <option value="">Select agent</option>
          {agentOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Total collected amount" value={totalAmount} onChange={(event) => setTotalAmount(event.target.value)} />
        <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
          {paymentModes.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" value={collectionDate} onChange={(event) => setCollectionDate(event.target.value)} />
        <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={reuseCollectionId} onChange={(event) => setReuseCollectionId(event.target.value)}>
          <option value="">Reuse unallocated balance</option>
          {collections
            .filter((item) => item.agentCode === agentCode && Number(item.unallocatedAmount) > 0)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.voucherNo} • {formatInr(item.unallocatedAmount)}
              </option>
            ))}
        </select>
        <button className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" onClick={() => void bootstrap()} type="button">
          Refresh Ledger
        </button>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-6">
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm xl:col-span-2" placeholder="Reference number" value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm xl:col-span-2" placeholder="Remark" value={remark} onChange={(event) => setRemark(event.target.value)} />
        <div className="grid gap-4 xl:col-span-2 xl:grid-cols-3">
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Search students to allocate" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={session} onChange={(event) => setSession(event.target.value)}>
            <option value="">Select session</option>
            {sessionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={yearLabel} onChange={(event) => setYearLabel(event.target.value)}>
            <option value="">Select year</option>
            {yearOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <button className="rounded-2xl bg-emerald-800 px-4 py-3 font-semibold text-white" onClick={() => void runSearch()} type="button">
          Search Students
        </button>
        <button className="rounded-2xl bg-slate-200 px-4 py-3 font-semibold text-slate-800" onClick={selectVisibleStudents} type="button">
          Select Filtered Students
        </button>
        <button className="rounded-2xl bg-slate-200 px-4 py-3 font-semibold text-slate-800" onClick={clearVisibleStudents} type="button">
          Clear Filtered Selection
        </button>
        <button className="rounded-2xl bg-orange-100 px-4 py-3 font-semibold text-orange-800" onClick={distributeEqually} type="button">
          Distribute Equally
        </button>
        <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-700">Allocated: {formatInr(allocatedTotal)}</span>
        <span className={`rounded-full px-3 py-2 ${remainingAmount < 0 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>
          Remaining: {formatInr(Number.isFinite(remainingAmount) ? remainingAmount : 0)}
        </span>
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
              <th className="px-4 py-3 font-medium">Year</th>
              <th className="px-4 py-3 font-medium">Institute</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium">Allocate Amount</th>
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
                    <td className="px-4 py-3">{row.yearLabel}</td>
                    <td className="px-4 py-3">{row.instituteName}</td>
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
                  Search students to allocate this agent collection
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button className="rounded-2xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70" disabled={loading || bootstrapping} onClick={() => void createCollection()} type="button">
          {loading ? "Saving Agent Collection..." : "Save Agent Collection"}
        </button>
        <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70" disabled={loading || bootstrapping} onClick={() => void reuseUnallocatedBalance()} type="button">
          {loading ? "Allocating..." : "Use Unallocated Balance"}
        </button>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="font-serif text-2xl font-semibold">Recent Agent Collections</h4>
            <p className="mt-1 text-sm text-slate-600">Track bulk deposits, allocated amounts, and pending balances.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {collections.length ? (
            collections.map((item) => (
              <article key={item.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h5 className="font-semibold text-slate-900">{item.agentName}</h5>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{item.agentCode} • {item.voucherNo}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">{new Date(item.collectionDate).toLocaleDateString()}</span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total</p>
                    <p className="mt-1 font-semibold text-slate-900">{formatInr(item.totalAmount)}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Allocated</p>
                    <p className="mt-1 font-semibold text-emerald-700">{formatInr(item.allocatedAmount)}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Unallocated</p>
                    <p className="mt-1 font-semibold text-amber-700">{formatInr(item.unallocatedAmount)}</p>
                  </div>
                </div>

                <div className="mt-4 text-sm text-slate-600">
                  <p>Payment Mode: {item.paymentMode}</p>
                  {item.referenceNo ? <p>Reference: {item.referenceNo}</p> : null}
                  {item.remark ? <p>Remark: {item.remark}</p> : null}
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Allocations</p>
                  {item.allocations.length ? (
                    item.allocations.map((allocation) => (
                      <div key={allocation.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm">
                        <div>
                          <p className="font-medium text-slate-900">{allocation.studentCode} • {allocation.studentName}</p>
                        </div>
                        <p className="font-semibold text-slate-700">{formatInr(allocation.amountAllocated)}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">No student allocations yet. The amount is still unallocated.</div>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-10 text-sm text-slate-500 lg:col-span-2">
              {bootstrapping ? "Loading recent agent collections..." : "No agent collections recorded yet."}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
