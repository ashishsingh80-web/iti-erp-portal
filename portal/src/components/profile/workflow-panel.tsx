import { StatusBadge } from "@/components/ui/status-badge";

type WorkflowPanelProps = {
  workflow: {
    documentsStatus: string;
    nextStudentStatus: string;
    blockers: string[];
    rules: Array<{
      code: string;
      label: string;
      required: boolean;
      uploaded: boolean;
      verificationStatus: string;
    }>;
  };
};

export function WorkflowPanel({ workflow }: WorkflowPanelProps) {
  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Workflow Rules</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Completion Automation</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge prefix="Documents" status={workflow.documentsStatus} />
          <StatusBadge prefix="Next Status" status={workflow.nextStudentStatus} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div>
          <h4 className="font-semibold text-slate-900">Required Document Rules</h4>
          <div className="mt-4 overflow-x-auto rounded-3xl border border-slate-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Document</th>
                  <th className="px-4 py-3 font-medium">Required</th>
                  <th className="px-4 py-3 font-medium">Uploaded</th>
                  <th className="px-4 py-3 font-medium">Verification</th>
                </tr>
              </thead>
              <tbody>
                {workflow.rules.map((item) => (
                  <tr key={item.code} className="border-t border-slate-100">
                    <td className="px-4 py-3">{item.label}</td>
                    <td className="px-4 py-3">{item.required ? "Yes" : "Optional"}</td>
                    <td className="px-4 py-3">{item.uploaded ? "Yes" : "No"}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.verificationStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-slate-900">Current Blockers</h4>
          <div className="mt-4 rounded-3xl border border-slate-100 bg-white p-5">
            {workflow.blockers.length ? (
              <ul className="space-y-3 text-sm text-slate-700">
                {workflow.blockers.map((item, index) => (
                  <li key={item} className="flex gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-semibold text-amber-900">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                <p className="text-sm font-semibold text-emerald-800">No blockers. This student is ready for completion flow.</p>
                <p className="mt-2 text-sm text-emerald-700">Documents and workflow conditions are currently clear.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
