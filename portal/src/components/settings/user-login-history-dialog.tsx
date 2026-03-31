"use client";

import { useState } from "react";

type LoginHistoryRow = {
  id: string;
  eventType: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  ipAddress: string;
  userAgent: string;
  deviceLabel: string;
  createdAt: string;
};

export function UserLoginHistoryDialog({
  userName,
  userEmail,
  rows
}: {
  userName: string;
  userEmail: string;
  rows: LoginHistoryRow[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
        onClick={() => setOpen(true)}
        type="button"
      >
        View Logins
      </button>

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 px-4 py-6">
          <div className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">User Login History</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">{userName}</h3>
                <p className="mt-1 text-sm text-slate-600">{userEmail}</p>
              </div>
              <button
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                onClick={() => setOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto p-6">
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Device</th>
                      <th>IP</th>
                      <th>User Agent</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? (
                      rows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.eventType}</td>
                          <td>{row.deviceLabel || "-"}</td>
                          <td>{row.ipAddress || "-"}</td>
                          <td className="max-w-[320px] whitespace-pre-wrap break-words text-xs text-slate-600">{row.userAgent || "-"}</td>
                          <td>{new Date(row.createdAt).toLocaleString("en-IN")}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                          No login events found for this user.
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
