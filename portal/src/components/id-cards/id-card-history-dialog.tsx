"use client";

import { useState } from "react";

type HistoryItem = {
  printedAt: string;
  reason: string;
  printedBy: string;
};

export function IdCardHistoryDialog({
  cardNumber,
  code,
  fullName,
  history
}: {
  cardNumber: string;
  code: string;
  fullName: string;
  history: HistoryItem[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        onClick={() => setOpen(true)}
        type="button"
      >
        History
      </button>

      {open ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/45 px-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-slate-500">ID Card History</p>
                <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">{fullName}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {cardNumber} • {code}
                </p>
              </div>
              <button
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                onClick={() => setOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="max-h-[65vh] overflow-auto p-6">
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Printed On</th>
                      <th>Reason</th>
                      <th>Printed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length ? (
                      history
                        .slice()
                        .reverse()
                        .map((item, index) => (
                          <tr key={`${item.printedAt}-${index}`}>
                            <td>V{history.length - index}</td>
                            <td>{new Date(item.printedAt).toLocaleString("en-IN")}</td>
                            <td>{item.reason}</td>
                            <td>{item.printedBy}</td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td className="px-3 py-6 text-center text-slate-500" colSpan={4}>
                          No print history found for this card.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
