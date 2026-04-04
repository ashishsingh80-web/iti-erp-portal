"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatInr } from "@/lib/currency";
import { fetchJsonSafe } from "@/lib/fetch-json";
import type { StudentDirectoryRow } from "@/lib/types";
import { showToast } from "@/lib/toast";
import { t } from "@/lib/i18n";
import { useAppLanguage } from "@/lib/use-app-language";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

export function FeeCollectionDesk() {
  const lang = useAppLanguage();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<StudentDirectoryRow[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [payerType, setPayerType] = useState("STUDENT");
  const [agentCode, setAgentCode] = useState("");
  const [suggestions, setSuggestions] = useState<StudentDirectoryRow[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [referenceNo, setReferenceNo] = useState("");
  const [remark, setRemark] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentReceipts, setRecentReceipts] = useState<Array<{ studentId: string; transactionId: string; receiptNo: string }>>([]);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const suggestionRequestId = useRef(0);
  const selectedEntries = useMemo(
    () => Object.entries(selected).filter(([, amount]) => Number(amount) > 0),
    [selected]
  );
  const selectedCount = selectedEntries.length;
  const selectedTotal = useMemo(
    () => selectedEntries.reduce((sum, [, amount]) => sum + Number(amount || 0), 0),
    [selectedEntries]
  );

  const selectedStudentIds = useMemo(() => Object.keys(selected), [selected]);
  const selectedAgent = useMemo(() => {
    if (!selectedStudentIds.length) return { agentCode: undefined as string | undefined, agentName: undefined as string | undefined };

    const uniqueAgentCodes = new Set<string>();
    for (const studentId of selectedStudentIds) {
      const row = rows.find((r) => r.id === studentId);
      if (row?.agentCode) uniqueAgentCodes.add(row.agentCode);
    }

    if (uniqueAgentCodes.size !== 1) return { agentCode: undefined, agentName: undefined };
    const agentCodeOnly = Array.from(uniqueAgentCodes)[0];
    const rowWithAgent = rows.find((r) => r.agentCode === agentCodeOnly && selectedStudentIds.includes(r.id));

    return { agentCode: agentCodeOnly, agentName: rowWithAgent?.agentName || undefined };
  }, [rows, selectedStudentIds]);

  async function runSearch(nextSearch?: string) {
    setError("");
    const params = new URLSearchParams();
    const term = typeof nextSearch === "string" ? nextSearch : search;
    if (term.trim()) params.set("search", term.trim());
    const response = await fetch(`/api/students?${params.toString()}`);
    const result = await fetchJsonSafe<any>(response);

    if (!response.ok) {
      const nextError = result?.message || t(lang, "Unable to search students");
      setError(nextError);
      showToast({ kind: "error", title: t(lang, "Student search failed"), message: nextError });
      return;
    }

    const nextRows = Array.isArray(result?.rows) ? (result.rows as StudentDirectoryRow[]) : [];
    // Keep already-selected students in the table so due-validation doesn't break while typing.
    setRows((current) => {
      const byId = new Map(nextRows.map((r) => [r.id, r]));
      for (const studentId of selectedStudentIds) {
        if (byId.has(studentId)) continue;
        const existing = current.find((r) => r.id === studentId);
        if (existing) byId.set(studentId, existing);
      }
      const merged = Array.from(byId.values());
      merged.sort((a, b) => a.fullName.localeCompare(b.fullName));
      return merged;
    });
  }

  function selectSuggestion(row: StudentDirectoryRow) {
    setIsSuggestionOpen(false);
    setSearch(row.fullName);

    void (async () => {
      await runSearch(row.fullName);
      setSelected((current) => ({ ...current, [row.id]: current[row.id] ?? "" }));
    })();
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

  useEffect(() => {
    if (selectedAgent.agentCode) setAgentCode(selectedAgent.agentCode);
    else setAgentCode("");
  }, [selectedAgent.agentCode]);

  useEffect(() => {
    if (payerType !== "AGENT") return;
    if (selectedStudentIds.length === 0) return;
    if (!selectedAgent.agentCode) setPayerType("STUDENT");
  }, [payerType, selectedAgent.agentCode, selectedStudentIds.length]);

  useEffect(() => {
    const term = search.trim();
    if (!term) {
      setSuggestions([]);
      setIsSuggestionOpen(false);
      if (selectedStudentIds.length === 0) setRows([]);
      return;
    }

    const requestId = ++suggestionRequestId.current;
    const query = term.toLowerCase();
    setIsSuggesting(true);

    const handle = window.setTimeout(async () => {
      const params = new URLSearchParams();
      params.set("search", term);
      params.set("page", "1");
      params.set("pageSize", "8");
      params.set("sortBy", "fullName");
      params.set("sortDir", "asc");

      const response = await fetch(`/api/students?${params.toString()}`);
      const result = await fetchJsonSafe<any>(response);
      if (requestId !== suggestionRequestId.current) return;

      setIsSuggesting(false);
      if (!response.ok) {
        setSuggestions([]);
        setIsSuggestionOpen(false);
        return;
      }

      const rowsFromApi = Array.isArray(result.rows) ? (result.rows as StudentDirectoryRow[]) : [];
      const filtered = rowsFromApi
        .filter((r) => {
          const fullNameMatch = r.fullName.toLowerCase().startsWith(query);
          const codeMatch = (r.studentCode || "").toLowerCase().startsWith(query);
          const mobileMatch = (r.mobile || "").toLowerCase().startsWith(query);
          return fullNameMatch || codeMatch || mobileMatch;
        })
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
        .slice(0, 8);
      setSuggestions(filtered);
      setIsSuggestionOpen(filtered.length > 0);

      // Auto-populate the table as you type (startsWith alphabetically).
      // Merge in already-selected students to avoid losing due info.
      setRows((current) => {
        const byId = new Map(filtered.map((r) => [r.id, r]));
        for (const studentId of selectedStudentIds) {
          if (byId.has(studentId)) continue;
          const existing = current.find((r) => r.id === studentId);
          if (existing) byId.set(studentId, existing);
        }
        const merged = Array.from(byId.values());
        merged.sort((a, b) => a.fullName.localeCompare(b.fullName));
        return merged;
      });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    function onDocumentMouseDown(event: MouseEvent) {
      const el = searchWrapRef.current;
      if (!el) return;
      const target = event.target as Node | null;
      if (target && el.contains(target)) return;
      setIsSuggestionOpen(false);
    }

    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, []);

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
      const nextError = t(lang, "Amount must be greater than 0 and not more than current due");
      setError(nextError);
      showToast({ kind: "error", title: t(lang, "Fee not collected"), message: nextError });
      return;
    }

    const items = Object.entries(selected)
      .filter(([, amount]) => Number(amount) > 0)
      .map(([studentId, amountPaid]) => ({ studentId, amountPaid }));

    if (!items.length) {
      const nextError = t(lang, "Select at least one student and enter amount");
      setError(nextError);
      showToast({ kind: "error", title: t(lang, "Fee not collected"), message: nextError });
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
      const nextError = result?.message || t(lang, "Unable to collect fees");
      setError(nextError);
      showToast({ kind: "error", title: t(lang, "Fee collection failed"), message: nextError });
      return;
    }

    setSelected({});
    setRecentReceipts(Array.isArray(result.receipts) ? result.receipts : []);
    setMessage(
      result.allocationGroup
        ? `${t(lang, "Bulk fee collected for")} ${result.processed} ${t(lang, "students")}. ${t(lang, "Group")} ${result.allocationGroup}`
        : `${t(lang, "Fee collected for")} ${result.processed} ${result.processed === 1 ? t(lang, "student") : t(lang, "students")}`
    );
    showToast({
      kind: "success",
      title: t(lang, "Fee collected"),
      message: result.allocationGroup
        ? `${t(lang, "Processed")} ${result.processed} ${t(lang, "students")}`
        : `${t(lang, "Processed")} ${result.processed} ${result.processed === 1 ? t(lang, "student") : t(lang, "students")}`
    });
    await runSearch();
  }

  return (
    <section className="surface p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{t(lang, "Fees Module")}</p>
        <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">{t(lang, "Fee Collection Desk")}</h3>
        <p className="mt-2 text-sm text-slate-600">
          {t(
            lang,
            "Search students, select one or many, and collect student-wise or bulk fees with student or agent as payer."
          )}
        </p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-6">
        <div className="relative xl:col-span-2" ref={searchWrapRef}>
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm w-full"
            placeholder={t(lang, "Search student name")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onFocus={() => {
              if (suggestions.length) setIsSuggestionOpen(true);
            }}
          />
          {isSuggestionOpen ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-[320px] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
              {isSuggesting ? (
                <div className="px-4 py-3 text-sm text-slate-500">{t(lang, "Searching...")}</div>
              ) : suggestions.length ? (
                <div className="py-1">
                  {suggestions.map((row) => (
                    <button
                      key={row.id}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectSuggestion(row);
                      }}
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">{row.fullName}</span>
                        <span className="block truncate text-xs text-slate-500">{row.studentCode} • {row.tradeName}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
                        {row.agentCode ? t(lang, "AGENT") : t(lang, "STUDENT")}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={payerType} onChange={(event) => setPayerType(event.target.value)}>
          <option value="STUDENT">{t(lang, "STUDENT")}</option>
          <option value="AGENT">{t(lang, "AGENT")}</option>
        </select>
        {payerType === "AGENT" && selectedStudentIds.length > 0 && selectedAgent.agentCode ? (
          <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t(lang, "Agent Name (auto)")}</div>
            <div className="mt-1 font-semibold text-slate-900">{selectedAgent.agentName || selectedAgent.agentCode}</div>
          </div>
        ) : (
          <div className="xl:col-span-1 hidden xl:block" aria-hidden="true" />
        )}
        <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
          <option value="CASH">{t(lang, "Cash")}</option>
          <option value="UPI">UPI</option>
          <option value="BANK_TRANSFER">{t(lang, "Bank Transfer")}</option>
          <option value="ONLINE">{t(lang, "Online/Cheque")}</option>
        </select>
        <button className="btn-primary" onClick={() => void runSearch()} type="button">
          {t(lang, "Apply Filters")}
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder={t(lang, "Reference number")} value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder={t(lang, "Remark")} value={remark} onChange={(event) => setRemark(event.target.value)} />
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
              <th className="px-4 py-3 font-medium">{t(lang, "Select")}</th>
              <th className="px-4 py-3 font-medium">{t(lang, "Student")}</th>
              <th className="px-4 py-3 font-medium">{t(lang, "Institute")}</th>
              <th className="px-4 py-3 font-medium">{t(lang, "Status")}</th>
              <th className="px-4 py-3 font-medium">{t(lang, "Due")}</th>
              <th className="px-4 py-3 font-medium">{t(lang, "Amount to Collect")}</th>
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
                  {t(lang, "Search students to start fee collection")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-3 z-20 mt-5 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t(lang, "Selection")}</p>
            <p className="text-sm font-semibold text-slate-900">
              {selectedCount}{" "}
              {selectedCount === 1 ? t(lang, "student") : t(lang, "students")} • {formatInr(selectedTotal)}
            </p>
          </div>
          <button
            className="btn-dark disabled:opacity-70"
            disabled={loading || selectedCount === 0}
            onClick={() => void collectFees()}
            type="button"
          >
            {loading ? t(lang, "Collecting...") : t(lang, "Collect Fee")}
          </button>
        </div>
      </div>

      {recentReceipts.length ? (
        <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow-compact">{t(lang, "Recent Receipts")}</p>
              <h4 className="mt-2 text-xl font-semibold text-slate-900">{t(lang, "Print Fee Receipts")}</h4>
            </div>
            <span className="chip-success">
              {recentReceipts.length} {t(lang, "ready")}
            </span>
          </div>
          <div className="mt-4 data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t(lang, "Receipt No")}</th>
                  <th>{t(lang, "Student")}</th>
                  <th>{t(lang, "Print")}</th>
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
                          {t(lang, "Print Receipt")}
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
