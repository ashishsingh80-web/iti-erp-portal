"use client";

export function ReportActions() {
  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <button
        className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
        onClick={() => window.print()}
        type="button"
      >
        Print Current View
      </button>
    </div>
  );
}
