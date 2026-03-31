import Link from "next/link";
import {
  getExamDeskSummary,
  getExamReasonSummary,
  listExamDeskRows,
  listExamOverrideRows,
  listHallTicketIssueRows
} from "@/lib/services/exam-service";
import { formatInr } from "@/lib/currency";

export async function ExamStatusDesk({
  search
}: {
  search?: string;
}) {
  const [summary, rows, reasonSummary, overrideRows, hallTicketRows] = await Promise.all([
    getExamDeskSummary(),
    listExamDeskRows(search || ""),
    getExamReasonSummary(search || ""),
    listExamOverrideRows(search || ""),
    listHallTicketIssueRows(search || "")
  ]);
  const exportQuery = search ? `?search=${encodeURIComponent(search)}` : "";

  return (
    <div className="grid gap-6">
      <section className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">Examination Control</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">
              Eligibility, Hall Ticket, Practical Permission
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              This desk shows whether the student is exam-fee ready, hall-ticket ready, practical-permission ready, and result-published.
            </p>
          </div>
          <form action="/modules/exam-status" className="flex flex-wrap items-end gap-3">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Search Student</span>
              <input
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                defaultValue={search || ""}
                name="search"
                placeholder="Student name, code, mobile"
              />
            </label>
            <button className="btn-secondary" type="submit">Apply</button>
            <a className="btn-secondary" href={`/api/exam-status/report${exportQuery}`}>
              Export Eligibility
            </a>
            <a className="btn-secondary" href={`/api/exam-status/report?kind=results${search ? `&search=${encodeURIComponent(search)}` : ""}`}>
              Export Results
            </a>
            <a className="btn-secondary" href={`/api/exam-status/report?kind=overrides${search ? `&search=${encodeURIComponent(search)}` : ""}`}>
              Export Overrides
            </a>
            <a className="btn-secondary" href={`/api/exam-status/report?kind=hall-ticket${search ? `&search=${encodeURIComponent(search)}` : ""}`}>
              Export Hall Tickets
            </a>
          </form>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total</p><p className="mt-2 text-2xl font-semibold text-slate-950">{summary.total}</p></div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Hall Ticket Ready</p><p className="mt-2 text-2xl font-semibold text-emerald-900">{summary.hallTicketReady}</p></div>
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4"><p className="text-xs uppercase tracking-[0.18em] text-cyan-700">Practical Ready</p><p className="mt-2 text-2xl font-semibold text-cyan-900">{summary.practicalPermissionReady}</p></div>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4"><p className="text-xs uppercase tracking-[0.18em] text-indigo-700">Result Published</p><p className="mt-2 text-2xl font-semibold text-indigo-900">{summary.resultPublished}</p></div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4"><p className="text-xs uppercase tracking-[0.18em] text-rose-700">Blocked</p><p className="mt-2 text-2xl font-semibold text-rose-900">{summary.blocked}</p></div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><p className="text-xs uppercase tracking-[0.18em] text-amber-700">Overrides</p><p className="mt-2 text-2xl font-semibold text-amber-900">{summary.overrides}</p></div>
        </div>
      </section>

      <section className="surface p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">Not Eligible Reasons</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">
              Blocker Summary
            </h3>
          </div>
          <span className="chip-warning">{reasonSummary.length} reasons</span>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reasonSummary.length ? (
            reasonSummary.map((item) => (
              <article key={item.reason} className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-rose-700">{item.count} students</p>
                <p className="mt-2 text-sm font-semibold text-rose-900">{item.reason}</p>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
              No active blockers in the current filtered view.
            </div>
          )}
        </div>
      </section>

      <section className="surface p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">Override Register</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">
              Practical And Exam Override Cases
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              This register tracks students who are moving with practical admin override or exam override reasons.
            </p>
          </div>
          <span className="chip-warning">{overrideRows.length} cases</span>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[1000px] table-fixed">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                <th className="px-3 py-3">Student</th>
                <th className="px-3 py-3">Override Type</th>
                <th className="px-3 py-3">Reason</th>
                <th className="px-3 py-3">Issue Status</th>
                <th className="px-3 py-3">Blockers</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {overrideRows.length ? (
                overrideRows.slice(0, 12).map((row) => (
                  <tr key={`override-${row.id}`} className="border-b border-slate-100 align-top text-sm text-slate-700">
                    <td className="px-3 py-4">
                      <p className="font-semibold text-slate-900">{row.fullName}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.studentCode} • {row.instituteName}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.tradeName} • {row.session} / {row.yearLabel}</p>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-1">
                        {row.practicalAdminOverride ? (
                          <span className="rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-700">
                            Practical Override
                          </span>
                        ) : null}
                        {row.hasOverride ? (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                            Exam Override
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <p>{row.adminOverrideReason || "No exam override reason"}</p>
                    </td>
                    <td className="px-3 py-4">
                      <p>Docs: {row.documentsStatus}</p>
                      <p className="mt-1 text-xs text-slate-500">Eligibility: {row.eligibilityStatus}</p>
                      <p className="mt-1 text-xs text-slate-500">Fee due: {formatInr(row.feeDueAmount)}</p>
                    </td>
                    <td className="px-3 py-4">
                      {row.blockers.length ? (
                        <div className="flex flex-wrap gap-1">
                          {row.blockers.map((blocker) => (
                            <span key={`${row.id}-${blocker}`} className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-700">
                              {blocker}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                          Clear
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <Link className="btn-secondary" href={`/students/${row.id}`}>
                        Open Student
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-4 text-sm text-emerald-700" colSpan={6}>
                    No override cases in the current filtered view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-compact">Hall Ticket Register</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">
              Issued Hall Tickets
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              This register shows all issued hall tickets with print and verification trace.
            </p>
          </div>
          <span className="chip-success">{hallTicketRows.length} issued</span>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[1200px] table-fixed">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                <th className="px-3 py-3">Issue Date</th>
                <th className="px-3 py-3">Student</th>
                <th className="px-3 py-3">Register No.</th>
                <th className="px-3 py-3">Verification</th>
                <th className="px-3 py-3">Issued By</th>
                <th className="px-3 py-3">Print Trace</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {hallTicketRows.length ? (
                hallTicketRows.slice(0, 12).map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 align-top text-sm text-slate-700">
                    <td className="px-3 py-4">
                      <p className="font-semibold text-slate-900">{row.issueDate}</p>
                      <p className="mt-1 text-xs text-slate-500">Exam marked: {row.hallTicketIssuedOn || "Not marked"}</p>
                    </td>
                    <td className="px-3 py-4">
                      <p className="font-semibold text-slate-900">{row.fullName}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.studentCode} • {row.instituteName}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.tradeName} • {row.session} / {row.yearLabel}</p>
                    </td>
                    <td className="px-3 py-4">{row.certificateNumber}</td>
                    <td className="px-3 py-4">
                      <p className="break-all text-xs">{row.verificationCode}</p>
                    </td>
                    <td className="px-3 py-4">{row.issuedBy}</td>
                    <td className="px-3 py-4">
                      <p>Print count: {row.printCount}</p>
                      <p className="mt-1 text-xs text-slate-500">Last printed: {row.lastPrintedAt || "Issue date only"}</p>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link className="btn-secondary" href={`/students/${row.studentId}`}>
                          Open Student
                        </Link>
                        <Link className="btn-secondary" href={`/certificates/${row.id}`}>
                          Open Ticket
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-4 text-sm text-slate-500" colSpan={7}>
                    No hall tickets issued in the current filtered view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface p-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] table-fixed">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                <th className="px-3 py-3">Student</th>
                <th className="px-3 py-3">Trade</th>
                <th className="px-3 py-3">Exam Fee</th>
                <th className="px-3 py-3">Hall Ticket</th>
                <th className="px-3 py-3">Practical Permission</th>
                <th className="px-3 py-3">Practical</th>
                <th className="px-3 py-3">Theory</th>
                <th className="px-3 py-3">Result</th>
                <th className="px-3 py-3">Override</th>
                <th className="px-3 py-3">Blockers</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 align-top text-sm text-slate-700">
                  <td className="px-3 py-4">
                    <p className="font-semibold text-slate-900">{row.fullName}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.studentCode} • {row.instituteName}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.session} / {row.yearLabel}</p>
                  </td>
                  <td className="px-3 py-4">{row.tradeName}</td>
                  <td className="px-3 py-4">{row.examFeePaid ? "Paid" : "Pending"}</td>
                  <td className="px-3 py-4">
                    <p>{row.hallTicketReady ? "Ready" : "Blocked"}</p>
                    {row.hallTicketIssuedOn ? <p className="mt-1 text-xs text-slate-500">Issued: {row.hallTicketIssuedOn}</p> : null}
                  </td>
                  <td className="px-3 py-4">{row.practicalPermissionReady ? "Ready" : "Blocked"}</td>
                  <td className="px-3 py-4">{row.practicalResult}</td>
                  <td className="px-3 py-4">{row.theoryResult}</td>
                  <td className="px-3 py-4">
                    <p>{row.resultPublished ? "Published" : "Pending"}</p>
                    {row.resultDeclaredOn ? <p className="mt-1 text-xs text-slate-500">{row.resultDeclaredOn}</p> : null}
                  </td>
                  <td className="px-3 py-4">
                    {row.hasOverride ? (
                      <div className="space-y-1">
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                          Override
                        </span>
                        <p className="text-xs text-slate-500">{row.adminOverrideReason}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">No override</span>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    {row.blockers.length ? (
                      <div className="flex flex-wrap gap-1">
                        {row.blockers.map((blocker) => (
                          <span key={blocker} className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-700">
                            {blocker}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        Clear
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    <Link className="btn-secondary" href={`/students/${row.id}`}>
                      Open Student
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
