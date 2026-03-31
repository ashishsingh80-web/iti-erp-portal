"use client";

export function ManagementPrintActions() {
  return (
    <button
      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      onClick={() => window.print()}
      type="button"
    >
      Print Summary
    </button>
  );
}
