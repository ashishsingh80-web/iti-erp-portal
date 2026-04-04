"use client";

import { useMemo, useState } from "react";
import { t } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import { useAppLanguage } from "@/lib/use-app-language";

export type AdmissionRegisterBulkRow = {
  id: string;
  studentCode: string;
  fullName: string;
  documentsStatus: string;
};

type AdmissionRegisterBulkBarProps = {
  rows: AdmissionRegisterBulkRow[];
};

export function AdmissionRegisterBulkBar({ rows }: AdmissionRegisterBulkBarProps) {
  const lang = useAppLanguage();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const pendingDocsRows = useMemo(
    () => rows.filter((r) => r.documentsStatus === "PENDING" || r.documentsStatus === "INCOMPLETE"),
    [rows]
  );

  const selectAllVisible = () => {
    setSelected(new Set(rows.map((r) => r.id)));
  };

  const selectPendingDocs = () => {
    setSelected(new Set(pendingDocsRows.map((r) => r.id)));
  };

  const clearSelection = () => setSelected(new Set());

  async function runDeskVerify() {
    if (!selected.size) {
      showToast({
        kind: "info",
        title: t(lang, "Nothing selected"),
        message: t(lang, "Choose at least one student in the table.")
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admissions/bulk-desk-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: Array.from(selected) })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || t(lang, "Unable to verify"));
      }

      showToast({
        kind: "success",
        title: t(lang, "Desk verification applied"),
        message: `${result.updatedCount ?? 0} ${t(lang, "students updated.")}`
      });
      setSelected(new Set());
      window.location.reload();
    } catch (error) {
      showToast({
        kind: "error",
        title: t(lang, "Verification failed"),
        message: error instanceof Error ? error.message : t(lang, "Unable to verify")
      });
    } finally {
      setLoading(false);
    }
  }

  if (!rows.length) return null;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-emerald-900">{t(lang, "Bulk desk actions")}</p>
        <span className="text-xs text-emerald-800">
          {selected.size} / {rows.length} {t(lang, "selected")}
        </span>
      </div>
      <p className="text-xs leading-5 text-emerald-800">
        {t(
          lang,
          "Marks admission form, 10th eligibility, and documents as verified and sets status to admitted (for files you have already checked at the office). Parent undertaking is unchanged."
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800"
          disabled={loading}
          onClick={selectAllVisible}
          type="button"
        >
          {t(lang, "Select all in table")}
        </button>
        <button
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 disabled:opacity-50"
          disabled={loading || !pendingDocsRows.length}
          onClick={selectPendingDocs}
          type="button"
        >
          {t(lang, "Select pending documents")}
        </button>
        <button
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          disabled={loading || !selected.size}
          onClick={clearSelection}
          type="button"
        >
          {t(lang, "Clear")}
        </button>
        <button
          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading || !selected.size}
          onClick={runDeskVerify}
          type="button"
        >
          {loading ? t(lang, "Working...") : t(lang, "Apply desk verification")}
        </button>
      </div>
    </div>
  );
}
