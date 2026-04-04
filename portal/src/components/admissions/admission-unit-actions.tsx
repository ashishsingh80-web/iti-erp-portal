"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import { useAppLanguage } from "@/lib/use-app-language";

export function AdmissionUnitActions({
  studentId,
  currentUnitNumber
}: {
  studentId: string;
  currentUnitNumber: number | null;
}) {
  const lang = useAppLanguage();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [unitInput, setUnitInput] = useState(currentUnitNumber ? String(currentUnitNumber) : "1");

  async function assignUnit() {
    const unitNumber = Number(unitInput.trim());
    if (!Number.isInteger(unitNumber) || unitNumber <= 0) {
      showToast({
        kind: "error",
        title: t(lang, "Invalid unit"),
        message: t(lang, "Please enter a valid positive unit number")
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/students/${studentId}/admission-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "ASSIGN_UNIT",
          unitNumber
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || t(lang, "Unable to assign unit"));
      }

      const code = result.student?.studentCode || t(lang, "Student");
      const n = result.student?.unitNumber ?? unitNumber;
      showToast({
        kind: "success",
        title: currentUnitNumber ? t(lang, "Unit updated") : t(lang, "Unit assigned"),
        message: `${code} ${t(lang, "moved to")} ${t(lang, "Unit")} ${n}`
      });
      setOpen(false);
      window.location.reload();
    } catch (error) {
      showToast({
        kind: "error",
        title: t(lang, "Unit assignment failed"),
        message: error instanceof Error ? error.message : t(lang, "Unable to assign unit")
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={loading}
        onClick={() => {
          setUnitInput(currentUnitNumber ? String(currentUnitNumber) : "1");
          setOpen(true);
        }}
        type="button"
      >
        {currentUnitNumber ? t(lang, "Change Unit") : t(lang, "Assign Unit")}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{t(lang, "Admission")}</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">
              {currentUnitNumber ? t(lang, "Change Unit") : t(lang, "Assign Unit")}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{t(lang, "Enter the destination unit number.")}</p>
            <input
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500"
              inputMode="numeric"
              min={1}
              onChange={(event) => setUnitInput(event.target.value)}
              placeholder={t(lang, "Unit number")}
              value={unitInput}
            />
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                disabled={loading}
                onClick={() => setOpen(false)}
                type="button"
              >
                {t(lang, "Cancel")}
              </button>
              <button
                className="rounded-2xl bg-violet-700 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
                onClick={() => void assignUnit()}
                type="button"
              >
                {loading
                  ? t(lang, "Saving...")
                  : currentUnitNumber
                    ? t(lang, "Update Unit")
                    : t(lang, "Assign Unit")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
