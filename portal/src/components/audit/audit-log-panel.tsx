import { listAuditLogs } from "@/lib/services/audit-service";

export async function AuditLogPanel() {
  const rows = await listAuditLogs({ limit: 100 });

  return (
    <section className="surface p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Audit Trail</p>
        <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Recent Activity</h3>
        <p className="mt-2 text-sm text-slate-600">Who changed what, in which module, and for which student.</p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-100">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Module</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{new Date(row.createdAt).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{row.userName}</p>
                      <p className="text-xs text-slate-500">{row.userEmail || "System action"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{row.module}</td>
                  <td className="px-4 py-3">{row.action}</td>
                  <td className="px-4 py-3">
                    {row.studentCode ? (
                      <div>
                        <p className="font-medium text-slate-900">{row.studentCode}</p>
                        <p className="text-xs text-slate-500">{row.studentName}</p>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <pre className="max-w-[360px] whitespace-pre-wrap break-words text-xs text-slate-600">
                      {row.metadata ? JSON.stringify(row.metadata, null, 2) : "-"}
                    </pre>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-slate-100">
                <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                  No audit entries yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
