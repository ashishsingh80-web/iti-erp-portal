"use client";

export function PortalPrintActions({ backHref }: { backHref: string }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 print:hidden">
      <button
        className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
        onClick={() => window.print()}
        type="button"
      >
        Print / Save PDF
      </button>
      <a className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700" href={backHref}>
        Back to Portal
      </a>
    </div>
  );
}
