"use client";

import { useEffect, useState } from "react";
import { formatInr } from "@/lib/currency";
import { fetchJsonSafe } from "@/lib/fetch-json";
import { t } from "@/lib/i18n";
import { useAppLanguage } from "@/lib/use-app-language";
import { SkeletonBlock } from "@/components/ui/skeleton-block";

type AgentOutstandingRow = {
  agentCode: string;
  agentName: string;
  totalStudents: number;
  committedAmount: string;
  paidAgainstStudents: string;
  directPaidByStudents: string;
  outstandingAmount: string;
  totalCollections: string;
  unallocatedBalance: string;
  studentRows: Array<{
    studentId: string;
    studentCode: string;
    fullName: string;
    session: string;
    yearLabel: string;
    finalFees: string;
    paidAmount: string;
    dueAmount: string;
  }>;
};

export function AgentOutstandingPanel() {
  const [rows, setRows] = useState<AgentOutstandingRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const lang = useAppLanguage();

  useEffect(() => {
    void loadRows();
  }, []);

  async function loadRows() {
    setError("");
    setLoading(true);
    const response = await fetch("/api/fees/agent-collections");
    const result = await fetchJsonSafe<any>(response);

    if (!response.ok) {
      setError(result?.message || t(lang, "Unable to load agent outstanding ledger"));
      setLoading(false);
      return;
    }

    setRows(result.agentOutstandingRows || []);
    setLoading(false);
  }

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{t(lang, "Fees Module")}</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">{t(lang, "Agent Outstanding Ledger")}</h3>
          <p className="mt-2 text-sm text-slate-600">
            {t(
              lang,
              "See agent-wise committed amount, collected amount, unallocated balance, and pending student dues."
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a className="rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white" href="/api/reports?report=agent-statement&format=csv">
            {t(lang, "Export Agent Statement")}
          </a>
          <button className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" onClick={() => void loadRows()} type="button">
            {t(lang, "Refresh Ledger")}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="mt-6 grid gap-4">
        {loading ? (
          [1, 2].map((item) => (
            <article key={item} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <SkeletonBlock className="h-6 w-40" />
                  <SkeletonBlock className="mt-2 h-4 w-24" />
                </div>
                <SkeletonBlock className="h-8 w-32" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                {[1, 2, 3, 4, 5].map((card) => (
                  <div key={card} className="rounded-2xl bg-white px-4 py-3">
                    <SkeletonBlock className="h-4 w-24" />
                    <SkeletonBlock className="mt-2 h-5 w-16" />
                  </div>
                ))}
              </div>
            </article>
          ))
        ) : rows.length ? (
          rows.map((row) => (
            <article key={row.agentCode} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              {(() => {
                const committed = Number(row.committedAmount || 0);
                const paid = Number(row.paidAgainstStudents || 0);
                const outstanding = Number(row.outstandingAmount || 0);
                const collections = Number(row.totalCollections || 0);
                const unallocated = Number(row.unallocatedBalance || 0);
                const formulaDue = Math.max(committed - paid, 0);
                const allocatedFromCollections = Math.max(collections - unallocated, 0);
                const dueDiff = Math.abs(formulaDue - outstanding);
                return (
                  <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-slate-900">{row.agentName}</h4>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{row.agentCode}</p>
                </div>
                <span className="rounded-full bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700">
                  {t(lang, "Outstanding")} {formatInr(row.outstandingAmount)}
                </span>
              </div>

              <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-900">
                <p className="font-semibold uppercase tracking-[0.16em]">{t(lang, "Formula Preview")}</p>
                <p className="mt-1">
                  {t(lang, "Due")} = {t(lang, "Committed")} ({formatInr(committed)}) - {t(lang, "Paid")} ({formatInr(paid)}) ={" "}
                  {formatInr(formulaDue)}
                </p>
                <p className="mt-1">
                  {t(lang, "Allocated From Collections")} = {t(lang, "Collections")} ({formatInr(collections)}) -{" "}
                  {t(lang, "Unallocated")} ({formatInr(unallocated)}) = {formatInr(allocatedFromCollections)}
                </p>
                {dueDiff > 0.01 ? (
                  <p className="mt-1 font-semibold text-rose-700">
                    {t(lang, "Check needed: calculated due and stored due differ by ")}
                    {formatInr(dueDiff)}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t(lang, "Students")}</p>
                  <p className="mt-1 font-semibold text-slate-900">{row.totalStudents}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t(lang, "Committed")}</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatInr(row.committedAmount)}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t(lang, "Paid Against Students")}</p>
                  <p className="mt-1 font-semibold text-emerald-700">{formatInr(row.paidAgainstStudents)}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t(lang, "Direct Paid By Students")}</p>
                  <p className="mt-1 font-semibold text-sky-700">{formatInr(row.directPaidByStudents)}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t(lang, "Collections Taken")}</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatInr(row.totalCollections)}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t(lang, "Unallocated Balance")}</p>
                  <p className="mt-1 font-semibold text-amber-700">{formatInr(row.unallocatedBalance)}</p>
                </div>
              </div>

              <div className="data-table-wrap mt-4">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t(lang, "Student")}</th>
                      <th>{t(lang, "Session")}</th>
                      <th>{t(lang, "Final Fee")}</th>
                      <th>{t(lang, "Paid")}</th>
                      <th>{t(lang, "Due")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.studentRows.length ? (
                      row.studentRows.map((student) => (
                        <tr key={student.studentId} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{student.studentCode} • {student.fullName}</div>
                            <div className="text-xs text-slate-500">{student.yearLabel}</div>
                          </td>
                          <td className="px-4 py-3">{student.session}</td>
                          <td className="px-4 py-3">{formatInr(student.finalFees)}</td>
                          <td className="px-4 py-3">{formatInr(student.paidAmount)}</td>
                          <td className="px-4 py-3 font-semibold text-rose-700">{formatInr(student.dueAmount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="data-table-empty" colSpan={5}>
                          {t(lang, "No outstanding students for this agent.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
                  </>
                );
              })()}
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-10 text-sm text-slate-500">
            {t(
              lang,
              "No active agent outstanding ledger rows yet. Once agent-managed students and collections exist, this ledger will appear here."
            )}
          </div>
        )}
      </div>
    </section>
  );
}
