import Link from "next/link";
import { IdCardHistoryDialog } from "@/components/id-cards/id-card-history-dialog";
import { IdCardReplacementActions } from "@/components/id-cards/id-card-replacement-actions";
import { IdCardStatusActions } from "@/components/id-cards/id-card-status-actions";
import { instituteOptions, sessionOptions, tradeOptions, yearOptions } from "@/lib/constants";
import { getIdCardRegisterMap, listIdCardRegisterEntries } from "@/lib/id-card-register";
import { prisma } from "@/lib/prisma";
import { listStudents } from "@/lib/services/student-service";

export async function IdCardsDesk({
  search,
  registerSearch,
  registerType,
  registerScope,
  registerStatus,
  registerReplacementStatus
}: {
  search: string;
  registerSearch: string;
  registerType: string;
  registerScope: string;
  registerStatus: string;
  registerReplacementStatus: string;
}) {
  const query = search.trim();
  const [students, staff, registerMap, registerEntries] = await Promise.all([
    listStudents(query ? { search: query } : {}),
    prisma.hrStaff.findMany({
      where: query
        ? {
            OR: [
              { fullName: { startsWith: query, mode: "insensitive" } },
              { employeeCode: { startsWith: query, mode: "insensitive" } },
              { mobile: { startsWith: query, mode: "insensitive" } }
            ]
          }
        : {},
      orderBy: { createdAt: "desc" },
      take: 40
    }),
    getIdCardRegisterMap(),
    listIdCardRegisterEntries({
      entityType: registerType === "student" || registerType === "staff" ? registerType : "",
      search: registerSearch,
      reissueOnly: registerScope === "reissue",
      status: registerStatus === "ACTIVE" || registerStatus === "CANCELLED" || registerStatus === "REPLACED" ? registerStatus : "",
      replacementStatus:
        registerReplacementStatus === "NONE" || registerReplacementStatus === "REQUESTED" || registerReplacementStatus === "APPROVED"
          ? registerReplacementStatus
          : ""
    })
  ]);

  return (
    <div className="space-y-6">
      <section className="surface p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow-compact">Identity Cards</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Student And Staff Card Desk</h3>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Search by name, code, or mobile and open the printable ID card directly for students or staff.
            </p>
          </div>
          <form action="/modules/id-cards" className="flex flex-wrap items-end gap-3">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Search
              <input
                className="min-w-[280px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition placeholder:text-slate-400 focus:border-slate-400"
                defaultValue={query}
                name="search"
                placeholder="Student code, employee code, name, or mobile"
              />
            </label>
            <button className="btn-primary" type="submit">
              Search
            </button>
            {query ? (
              <Link className="btn-secondary" href="/modules/id-cards">
                Clear
              </Link>
            ) : null}
          </form>
        </div>
      </section>

      <section className="surface p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow-compact">Register</p>
            <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">ID Card Issue Register</h3>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Review issued and reissued cards, latest print reason, operator trace, and export-ready office history.
            </p>
          </div>
          <form action="/modules/id-cards" className="grid gap-3 md:grid-cols-5">
            <input name="search" type="hidden" value={query} />
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Search Register
              <input
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                defaultValue={registerSearch}
                name="registerSearch"
                placeholder="Name, code, reason, or user"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Type
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={registerType} name="registerType">
                <option value="">All</option>
                <option value="student">Students</option>
                <option value="staff">Staff</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Scope
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={registerScope} name="registerScope">
                <option value="all">All Prints</option>
                <option value="reissue">Reissues Only</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Status
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={registerStatus} name="registerStatus">
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REPLACED">Replaced</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Replacement
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue={registerReplacementStatus} name="registerReplacementStatus">
                <option value="">All Workflow States</option>
                <option value="NONE">No Replacement</option>
                <option value="REQUESTED">Requested</option>
                <option value="APPROVED">Approved</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button className="btn-primary" type="submit">
                Apply
              </button>
              <a
                className="btn-secondary"
                href={`/api/id-cards/register?${new URLSearchParams(
                  Object.entries({
                    registerSearch,
                    registerType,
                    registerScope,
                    registerStatus,
                    registerReplacementStatus
                  }).filter(([, value]) => value)
                ).toString()}`}
              >
                Export CSV
              </a>
            </div>
          </form>
        </div>

        <div className="mt-6 data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Card Number</th>
                <th>Code</th>
                <th>Name</th>
                <th>Status</th>
                <th>Version</th>
                <th>Print Count</th>
                <th>Last Printed</th>
                <th>Latest Reason</th>
                <th>Printed By</th>
                <th>Note</th>
                <th>Replacement</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {registerEntries.length ? (
                registerEntries.map((entry) => (
                  <tr key={`${entry.entityType}:${entry.entityId}`}>
                    <td>{entry.entityType === "student" ? "Student" : "Staff"}</td>
                    <td>{entry.cardNumber}</td>
                    <td>{entry.code}</td>
                    <td>{entry.fullName}</td>
                    <td>
                      <span
                        className={
                          entry.status === "ACTIVE"
                            ? "chip-success"
                            : entry.status === "CANCELLED"
                              ? "chip-warning"
                              : "chip-neutral"
                        }
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td>V{entry.issueVersion}</td>
                    <td>{entry.printCount}</td>
                    <td>{new Date(entry.lastPrintedAt).toLocaleString("en-IN")}</td>
                    <td>{entry.lastReason}</td>
                    <td>{entry.lastPrintedBy}</td>
                    <td>{entry.statusNote || "-"}</td>
                    <td>
                      <div className="space-y-1 text-xs text-slate-600">
                        <p>{entry.replacementStatus}</p>
                        {entry.replacementRequestedAt ? <p>Requested: {new Date(entry.replacementRequestedAt).toLocaleString("en-IN")}</p> : null}
                        {entry.replacementRequestedBy ? <p>Requested By: {entry.replacementRequestedBy}</p> : null}
                        {entry.replacementReason ? <p>Reason: {entry.replacementReason}</p> : null}
                        {entry.replacementFee ? <p>Fee: {entry.replacementFee}</p> : null}
                        {entry.replacementPaymentMode ? <p>Mode: {entry.replacementPaymentMode}</p> : null}
                        {entry.replacementReferenceNo ? <p>Ref: {entry.replacementReferenceNo}</p> : null}
                        {entry.replacementApprovedAt ? <p>Approved: {new Date(entry.replacementApprovedAt).toLocaleString("en-IN")}</p> : null}
                        {entry.replacementApprovedBy ? <p>Approved By: {entry.replacementApprovedBy}</p> : null}
                        {entry.replacementReceiptNumber ? <p>Receipt: {entry.replacementReceiptNumber}</p> : null}
                        {entry.replacementFeePostedAt ? <p>Posted: {new Date(entry.replacementFeePostedAt).toLocaleString("en-IN")}</p> : null}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <IdCardHistoryDialog cardNumber={entry.cardNumber} code={entry.code} fullName={entry.fullName} history={entry.history} />
                        {entry.replacementReceiptNumber ? (
                          <Link className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800" href={`/id-cards/replacement-receipts/${entry.entityType}/${entry.entityId}`} target="_blank">
                            Open Receipt
                          </Link>
                        ) : null}
                        <IdCardReplacementActions entityId={entry.entityId} entityType={entry.entityType} replacementStatus={entry.replacementStatus} />
                        <IdCardStatusActions entityId={entry.entityId} entityType={entry.entityType} status={entry.status} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={13}>
                    No ID card register entries found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="surface p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-compact">Students</p>
              <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Student ID Cards</h3>
            </div>
            <span className="chip-success">{students.length} records</span>
          </div>

          <form action="/id-cards/bulk" className="mt-6 grid gap-3 rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4 md:grid-cols-2 xl:grid-cols-5" target="_blank">
            <input name="type" type="hidden" value="students" />
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Institute
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue="" name="instituteCode">
                <option value="">All institutes</option>
                {instituteOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Trade
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue="" name="tradeValue">
                <option value="">All trades</option>
                {tradeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Session
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue="" name="session">
                <option value="">All sessions</option>
                {sessionOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Year
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue="" name="yearLabel">
                <option value="">All years</option>
                {yearOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button className="btn-primary w-full" type="submit">
                Bulk Print Students
              </button>
            </div>
          </form>

          <div className="mt-6 grid gap-4">
            {students.length ? (
              students.map((item) => (
                <article key={item.id} className="rounded-3xl border border-slate-100 bg-white p-5">
                  {(() => {
                    const registerEntry = registerMap.get(`student:${item.id}`);
                    return (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        {item.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt={item.fullName} className="h-full w-full object-cover" src={item.photoUrl} />
                        ) : (
                          <span className="text-lg font-semibold text-slate-400">{item.fullName.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.studentCode}</p>
                        <h4 className="mt-2 text-lg font-semibold text-slate-900">{item.fullName}</h4>
                        <p className="mt-2 text-sm text-slate-600">
                          {item.instituteName} ({item.instituteCode}) • {item.tradeName}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          {item.session} • {item.yearLabel} • Unit {item.unitNumber || "Not Set"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Card No.: {registerEntry?.cardNumber || "Pending"} • Version V{registerEntry?.issueVersion || 1}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Printed {registerEntry?.printCount || 0} times • {registerEntry?.lastPrintedAt ? new Date(registerEntry.lastPrintedAt).toLocaleString("en-IN") : "Not printed yet"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Latest reason: {registerEntry?.lastReason || "Initial Issue"} • By {registerEntry?.lastPrintedBy || "-"}
                        </p>
                      </div>
                    </div>
                    <Link className="btn-secondary" href={`/id-cards/${item.id}`} target="_blank">
                      Open ID Card
                    </Link>
                  </div>
                    );
                  })()}
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                No student records found for the current search.
              </div>
            )}
          </div>
        </article>

        <article className="surface p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-compact">Staff</p>
              <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Staff ID Cards</h3>
            </div>
            <span className="chip-warning">{staff.length} records</span>
          </div>

          <form action="/staff-id-cards/bulk" className="mt-6 grid gap-3 rounded-3xl border border-amber-100 bg-amber-50/60 p-4 md:grid-cols-3" target="_blank">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Staff Scope
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" defaultValue="active" name="scope">
                <option value="active">Current Institute Staff</option>
                <option value="all">Whole Employee Register</option>
                <option value="govt">Government Record Only</option>
                <option value="experience">Experience Cases</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Department
              <input className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" name="department" placeholder="Optional department filter" />
            </label>
            <div className="flex items-end">
              <button className="btn-primary w-full" type="submit">
                Bulk Print Staff
              </button>
            </div>
          </form>

          <div className="mt-6 grid gap-4">
            {staff.length ? (
              staff.map((item) => (
                <article key={item.id} className="rounded-3xl border border-slate-100 bg-white p-5">
                  {(() => {
                    const registerEntry = registerMap.get(`staff:${item.id}`);
                    return (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        {item.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt={item.fullName} className="h-full w-full object-cover" src={item.photoUrl} />
                        ) : (
                          <span className="text-lg font-semibold text-slate-400">{item.fullName.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.employeeCode}</p>
                        <h4 className="mt-2 text-lg font-semibold text-slate-900">{item.fullName}</h4>
                        <p className="mt-2 text-sm text-slate-600">
                          {item.designation || "No designation"} • {item.department || "No department"}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          {item.staffCategory.replaceAll("_", " ")} • {item.employmentStatus.replaceAll("_", " ")}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Card No.: {registerEntry?.cardNumber || "Pending"} • Version V{registerEntry?.issueVersion || 1}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Printed {registerEntry?.printCount || 0} times • {registerEntry?.lastPrintedAt ? new Date(registerEntry.lastPrintedAt).toLocaleString("en-IN") : "Not printed yet"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Latest reason: {registerEntry?.lastReason || "Initial Issue"} • By {registerEntry?.lastPrintedBy || "-"}
                        </p>
                      </div>
                    </div>
                    <Link className="btn-secondary" href={`/staff-id-cards/${item.id}`} target="_blank">
                      Open ID Card
                    </Link>
                  </div>
                    );
                  })()}
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                No staff records found for the current search.
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
