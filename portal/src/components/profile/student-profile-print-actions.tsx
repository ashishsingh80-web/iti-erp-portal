"use client";

export function StudentProfilePrintActions() {
  return (
    <div className="mt-6 flex flex-wrap gap-3 print:hidden">
      <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white" onClick={() => window.print()} type="button">
        Print Student Profile
      </button>
      <button className="rounded-2xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-800" onClick={() => window.history.back()} type="button">
        Back
      </button>
    </div>
  );
}
