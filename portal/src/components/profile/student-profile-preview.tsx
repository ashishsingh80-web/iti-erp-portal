export function StudentProfilePreview() {
  return (
    <section className="surface p-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Student Profile</p>
        <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Full Lifecycle View</h3>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h4 className="font-semibold text-slate-900">Identity</h4>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>Student code and admission status</li>
            <li>Masked Aadhaar only in UI</li>
            <li>Institute and trade mapping</li>
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h4 className="font-semibold text-slate-900">Parents & Eligibility</h4>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>Parent/guardian identity section</li>
            <li>Parent Aadhaar document linkage</li>
            <li>10th qualification verification state</li>
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h4 className="font-semibold text-slate-900">Operations</h4>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>Documents and verifier notes</li>
            <li>Fees and due amount</li>
            <li>Scholarship, PRN / SCVT, and undertaking</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
