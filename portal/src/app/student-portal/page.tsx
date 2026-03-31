import Link from "next/link";
import { redirect } from "next/navigation";
import { LanguageSelector } from "@/components/header/language-selector";
import { StudentLogoutButton } from "@/components/auth/student-logout-button";
import { SupportRequestForm } from "@/components/portal/support-request-form";
import { t } from "@/lib/i18n";
import { readAppLanguage } from "@/lib/i18n-server";
import { requireStudentUser } from "@/lib/student-auth";
import { formatInr } from "@/lib/currency";
import { getStudentProfile } from "@/lib/services/student-service";

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN");
}

function buildExamReadiness(profile: Awaited<ReturnType<typeof getStudentProfile>> extends infer T ? NonNullable<T> : never) {
  const feeDueClear = Number(profile.fees?.dueAmount || "0") <= 0;
  const examFeePaid = Boolean(profile.examStatus?.examFeePaid);
  const documentsVerified = profile.workflow.documentsStatus === "VERIFIED";
  const eligibilityVerified = profile.workflow.rules.length > 0 ? !profile.workflow.blockers.includes("Eligibility verification pending") : true;
  const noDuesReady = profile.noDues.isReady;
  const hallTicketIssued = Boolean(profile.examStatus?.hallTicketIssuedOn);
  const resultPublished = Boolean(profile.examStatus?.resultPublished);
  const blockers = [
    !examFeePaid ? "Exam fee not paid" : null,
    !feeDueClear ? "Institute fee due is pending" : null,
    !documentsVerified ? "Documents are not fully verified" : null,
    !eligibilityVerified ? "Eligibility is not verified" : null,
    !noDuesReady ? "No dues clearance is pending" : null
  ].filter(Boolean) as string[];

  return {
    examFeePaid,
    feeDueClear,
    documentsVerified,
    eligibilityVerified,
    noDuesReady,
    hallTicketIssued,
    resultPublished,
    blockers
  };
}

function buildPortalAlerts(profile: Awaited<ReturnType<typeof getStudentProfile>> extends infer T ? NonNullable<T> : never) {
  const alerts: Array<{ tone: "danger" | "warning" | "success" | "info"; title: string; message: string }> = [];

  if (profile.fees && Number(profile.fees.dueAmount) > 0) {
    alerts.push({
      tone: "danger",
      title: "Fee Due Pending",
      message: `Current due amount is ${formatInr(profile.fees.dueAmount)}. Clear it to avoid exam and certificate blocking.`
    });
  }

  if (profile.scholarship?.status === "QUERY" || profile.scholarship?.status === "UNDER_PROCESS") {
    alerts.push({
      tone: "warning",
      title: "Scholarship Needs Attention",
      message: `Scholarship status is ${profile.scholarship.status}. Check documents and bank details with the institute desk.`
    });
  }

  if (profile.examStatus?.hallTicketIssuedOn) {
    alerts.push({
      tone: "success",
      title: "Hall Ticket Issued",
      message: `Hall ticket was issued on ${formatShortDate(profile.examStatus.hallTicketIssuedOn)}.`
    });
  } else if (profile.examStatus && !profile.examStatus.examFeePaid) {
    alerts.push({
      tone: "warning",
      title: "Exam Fee Pending",
      message: "Exam fee is not marked paid yet, so hall ticket issue may be blocked."
    });
  }

  if (profile.documents.some((item) => item.verificationStatus !== "VERIFIED")) {
    alerts.push({
      tone: "warning",
      title: "Documents Pending Verification",
      message: "One or more uploaded documents are still pending verification."
    });
  }

  if (profile.supportCases.some((item) => item.status !== "RESOLVED" && item.status !== "CLOSED")) {
    alerts.push({
      tone: "info",
      title: "Open Support Requests",
      message: "You have support cases still under office review."
    });
  }

  if (profile.scholarship?.creditedAmount && Number(profile.scholarship.creditedAmount) > 0) {
    alerts.push({
      tone: "success",
      title: "Scholarship Credited",
      message: `Scholarship credit of ${formatInr(profile.scholarship.creditedAmount)} is recorded${profile.scholarship.creditDate ? ` on ${formatShortDate(profile.scholarship.creditDate)}` : ""}.`
    });
  }

  if (!alerts.length) {
    alerts.push({
      tone: "success",
      title: "No Active Alerts",
      message: "Your key records currently look stable in the portal."
    });
  }

  return alerts.slice(0, 6);
}

export default async function StudentPortalPage() {
  const lang = await readAppLanguage();
  const student = await requireStudentUser();
  const profile = await getStudentProfile(student.id);

  if (!profile) {
    redirect("/student-login");
  }

  const examReadiness = buildExamReadiness(profile);
  const alerts = buildPortalAlerts(profile);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="surface rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-emerald-500 p-8 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/75">{t(lang, "Student Portal")}</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight">{profile.fullName}</h1>
            <p className="mt-2 text-sm text-white/85">
              {profile.studentCode} • {profile.tradeName} • {profile.session} • {profile.yearLabel}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector currentLanguage={lang} />
            <StudentLogoutButton className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t(lang, "Institute")}</p>
          <p className="mt-3 text-lg font-semibold text-slate-900">{profile.instituteName}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Mobile</p>
          <p className="mt-3 text-lg font-semibold text-slate-900">{profile.mobile}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t(lang, "Documents")}</p>
          <p className="mt-3 text-lg font-semibold text-slate-900">{profile.workflow.documentsStatus === "VERIFIED" ? "Verified" : "Pending"}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t(lang, "Workflow")}</p>
          <p className="mt-3 text-lg font-semibold text-slate-900">{profile.workflow.blockers.length ? "Pending" : "Ready"}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t(lang, "Attendance")}</p>
          <p className="mt-3 text-lg font-semibold text-slate-900">{profile.attendance.attendancePercentage}%</p>
          <p className="mt-1 text-sm text-slate-500">{profile.attendance.totalMarkedDays} marked days</p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-100 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{t(lang, "Notification Center")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{t(lang, "Important Alerts")}</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{alerts.length} alerts</span>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {alerts.map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              className={
                item.tone === "danger"
                  ? "rounded-3xl border border-rose-200 bg-rose-50 p-5"
                  : item.tone === "warning"
                    ? "rounded-3xl border border-amber-200 bg-amber-50 p-5"
                    : item.tone === "success"
                      ? "rounded-3xl border border-emerald-200 bg-emerald-50 p-5"
                      : "rounded-3xl border border-sky-200 bg-sky-50 p-5"
              }
            >
              <p className="text-sm font-semibold text-slate-900">{t(lang, item.title)}</p>
              <p className="mt-2 text-sm text-slate-700">{item.message}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Fee Status</h2>
          {profile.fees ? (
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>Final Fee: <span className="font-semibold text-slate-900">{formatInr(profile.fees.finalFees)}</span></p>
              <p>Paid Amount: <span className="font-semibold text-emerald-800">{formatInr(profile.fees.paidAmount)}</span></p>
              <p>Due Amount: <span className="font-semibold text-rose-800">{formatInr(profile.fees.dueAmount)}</span></p>
              <p>Status: <span className="font-semibold text-slate-900">{profile.fees.paymentStatus}</span></p>
              <p>Reminder Count: <span className="font-semibold text-slate-900">{profile.fees.reminderCount}</span></p>
              <p>Last Reminder: <span className="font-semibold text-slate-900">{profile.fees.lastReminderDate ? formatShortDate(profile.fees.lastReminderDate) : "-"}</span></p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Fee profile is not available yet.</p>
          )}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Scholarship Status</h2>
          {profile.scholarship ? (
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>Status: <span className="font-semibold text-slate-900">{profile.scholarship.status}</span></p>
              <p>Scholarship ID: <span className="font-semibold text-slate-900">{profile.scholarship.scholarshipId || "-"}</span></p>
              <p>Credited Amount: <span className="font-semibold text-emerald-800">{formatInr(profile.scholarship.creditedAmount || "0")}</span></p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Scholarship record is not available yet.</p>
          )}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Profile Basics</h2>
          <div className="mt-4 flex items-start gap-4">
            {profile.photoUrl ? <img alt={profile.fullName} className="h-20 w-20 rounded-2xl object-cover" src={profile.photoUrl} /> : null}
            <div className="space-y-2 text-sm text-slate-700">
              <p>DOB: <span className="font-semibold text-slate-900">{profile.dateOfBirth ? formatShortDate(profile.dateOfBirth) : "-"}</span></p>
              <p>Father: <span className="font-semibold text-slate-900">{profile.fatherName || "-"}</span></p>
              <p>Mother: <span className="font-semibold text-slate-900">{profile.motherName || "-"}</span></p>
              <p>Parent: <span className="font-semibold text-slate-900">{profile.parent?.name || "-"}{profile.parent?.relation ? ` (${profile.parent.relation})` : ""}</span></p>
              <p>Address: <span className="font-semibold text-slate-900">{profile.address || "-"}</span></p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">PRN / SCVT Status</h2>
          {profile.prnScvt ? (
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>Ent. Roll No.: <span className="font-semibold text-slate-900">{profile.prnScvt.entRollNumber || "-"}</span></p>
              <p>SCVT Reg. No.: <span className="font-semibold text-slate-900">{profile.prnScvt.scvtRegistrationNumber || "-"}</span></p>
              <p>PRN Number: <span className="font-semibold text-slate-900">{profile.prnScvt.prnNumber || "-"}</span></p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">PRN / SCVT record is not available yet.</p>
          )}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Exam Status</h2>
          {profile.examStatus ? (
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>Practical Result: <span className="font-semibold text-slate-900">{profile.examStatus.tradePracticalResult}</span></p>
              <p>Theory Result: <span className="font-semibold text-slate-900">{profile.examStatus.onlineTheoryResult}</span></p>
              <p>Practical Appearance: <span className="font-semibold text-slate-900">{profile.examStatus.practicalExamAppearance}</span></p>
              <p>Hall Ticket: <span className="font-semibold text-slate-900">{examReadiness.hallTicketIssued ? "Issued" : "Pending"}</span></p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Exam status is not available yet.</p>
          )}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Exam Readiness</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <p>Exam Fee: <span className={examReadiness.examFeePaid ? "font-semibold text-emerald-800" : "font-semibold text-rose-800"}>{examReadiness.examFeePaid ? "Clear" : "Pending"}</span></p>
            <p>Institute Fee Due: <span className={examReadiness.feeDueClear ? "font-semibold text-emerald-800" : "font-semibold text-rose-800"}>{examReadiness.feeDueClear ? "No Due" : "Pending"}</span></p>
            <p>Documents: <span className={examReadiness.documentsVerified ? "font-semibold text-emerald-800" : "font-semibold text-rose-800"}>{examReadiness.documentsVerified ? "Verified" : "Pending"}</span></p>
            <p>Eligibility: <span className={examReadiness.eligibilityVerified ? "font-semibold text-emerald-800" : "font-semibold text-rose-800"}>{examReadiness.eligibilityVerified ? "Verified" : "Pending"}</span></p>
            <p>No Dues: <span className={examReadiness.noDuesReady ? "font-semibold text-emerald-800" : "font-semibold text-rose-800"}>{examReadiness.noDuesReady ? "Clear" : `${profile.noDues.pendingDepartments} pending`}</span></p>
            <p>Hall Ticket: <span className={examReadiness.hallTicketIssued ? "font-semibold text-emerald-800" : "font-semibold text-amber-800"}>{examReadiness.hallTicketIssued ? "Issued" : "Not issued yet"}</span></p>
            <p>Result Published: <span className={examReadiness.resultPublished ? "font-semibold text-emerald-800" : "font-semibold text-slate-700"}>{examReadiness.resultPublished ? "Yes" : "No"}</span></p>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
            <p className="font-semibold text-slate-900">{examReadiness.blockers.length ? "Current Blockers" : "Ready for Hall Ticket Process"}</p>
            {examReadiness.blockers.length ? (
              <ul className="mt-2 space-y-1 text-slate-600">
                {examReadiness.blockers.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-emerald-800">All major readiness conditions are clear.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Attendance Summary</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-emerald-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Attended</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">{profile.attendance.attendedDays}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-rose-700">Absent</p>
              <p className="mt-2 text-2xl font-semibold text-rose-900">{profile.attendance.absentDays}</p>
            </div>
            <div className="rounded-2xl bg-sky-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-700">Percentage</p>
              <p className="mt-2 text-2xl font-semibold text-sky-900">{profile.attendance.attendancePercentage}%</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">Based on the latest 30 marked attendance days. Half day counts as 0.5.</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Monthly Attendance</h2>
          {profile.attendance.monthlySummary.length ? (
            <div className="mt-4 space-y-3">
              {profile.attendance.monthlySummary.map((item) => (
                <div key={item.monthLabel} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{item.monthLabel}</p>
                    <p className="font-semibold text-sky-800">{item.attendancePercentage}%</p>
                  </div>
                  <p className="mt-1 text-slate-600">
                    Attended {item.attendedDays} / {item.totalMarkedDays} • Absent {item.absentDays}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Monthly attendance summary is not available yet.</p>
          )}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Recent Fee Receipts</h2>
          {profile.fees?.transactions.length ? (
            <div className="mt-4 space-y-3">
              {profile.fees.transactions.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{item.receiptNo}</p>
                    <p className="text-slate-600">{new Date(item.transactionDate).toLocaleDateString("en-IN")} • {formatInr(item.amountPaid)}</p>
                  </div>
                  <Link className="font-semibold text-emerald-800 underline-offset-4 hover:underline" href={`/receipts/${item.id}`}>
                    Open Receipt
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No fee receipts available yet.</p>
          )}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Recent Documents</h2>
          {profile.documents.length ? (
            <div className="mt-4 space-y-3">
              {profile.documents.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{item.documentType}</p>
                    <p className="text-slate-600">{item.verificationStatus} • {item.originalName}</p>
                  </div>
                  <a className="font-semibold text-emerald-800 underline-offset-4 hover:underline" href={item.fileUrl} target="_blank" rel="noreferrer">
                    Open File
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No documents available yet.</p>
          )}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Issued Certificates</h2>
          {profile.certificates.length ? (
            <div className="mt-4 space-y-3">
              {profile.certificates.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{item.certificateType.replace(/_/g, " ")}</p>
                    <p className="text-slate-600">{item.certificateNumber} • {formatShortDate(item.issueDate)}</p>
                  </div>
                  <Link className="font-semibold text-emerald-800 underline-offset-4 hover:underline" href={`/student-portal/certificates/${item.id}`}>
                    Open Certificate
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No certificates have been issued yet.</p>
          )}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Undertaking</h2>
          {profile.undertaking ? (
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>Verification Code: <span className="font-semibold text-slate-900">{profile.undertaking.verificationCode || "-"}</span></p>
              <p>Status: <span className="font-semibold text-slate-900">{profile.undertaking.signedStatus}</span></p>
              <Link className="inline-flex rounded-full border border-emerald-300 px-4 py-2 font-semibold text-emerald-800" href="/student-portal/undertaking">
                Open Undertaking
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Undertaking is not available yet.</p>
          )}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">{t(lang, "Support Request")}</h2>
          <SupportRequestForm endpoint="/api/student-portal/support" lang={lang} />
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Recent Attendance</h2>
          {profile.attendance.recentRecords.length ? (
            <div className="mt-4 space-y-3">
              {profile.attendance.recentRecords.slice(0, 10).map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{formatShortDate(item.recordDate)}</p>
                    <p className="text-slate-600">
                      {item.status}
                      {item.checkInAt ? ` • In ${new Date(item.checkInAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}
                      {item.checkOutAt ? ` • Out ${new Date(item.checkOutAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}
                    </p>
                  </div>
                  <p className="max-w-xl text-right text-slate-500">{item.note || "No note"}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Attendance has not been marked yet.</p>
          )}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Recent Support Cases</h2>
          {profile.supportCases.length ? (
            <div className="mt-4 space-y-3">
              {profile.supportCases.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{item.grievanceNo} • {item.title}</p>
                    <p className="font-semibold text-slate-700">{item.status}</p>
                  </div>
                  <p className="mt-1 text-slate-600">{item.category} • {formatShortDate(item.createdAt)} • {item.priority}</p>
                  <p className="mt-1 text-slate-500">{item.resolutionNote || "Awaiting office update"}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No support cases raised yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
