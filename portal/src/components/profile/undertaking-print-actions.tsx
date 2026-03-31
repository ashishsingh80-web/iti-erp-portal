"use client";

import Link from "next/link";

type UndertakingPrintActionsProps = {
  studentId: string;
};

export function UndertakingPrintActions({ studentId }: UndertakingPrintActionsProps) {
  return (
    <div className="mt-6 flex flex-wrap gap-3 print:hidden">
      <button
        className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
        onClick={() => window.print()}
        type="button"
      >
        Print Undertaking
      </button>
      <Link className="rounded-2xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-800" href={`/students/${studentId}`}>
        Back to Student Profile
      </Link>
    </div>
  );
}
