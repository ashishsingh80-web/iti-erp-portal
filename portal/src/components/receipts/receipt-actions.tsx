"use client";

export function ReceiptActions({ studentId }: { studentId: string }) {
  return (
    <div className="mt-8 flex flex-wrap gap-3 print:hidden">
      <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white" onClick={() => window.print()} type="button">
        Print Receipt
      </button>
      <a className="rounded-2xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-800" href={`/students/${studentId}`}>
        Back to Student
      </a>
    </div>
  );
}
