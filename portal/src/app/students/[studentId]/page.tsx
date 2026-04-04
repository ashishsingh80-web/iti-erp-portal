import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentPanel } from "@/components/profile/document-panel";
import { OperationsPanel } from "@/components/profile/operations-panel";
import { StudentDangerPanel } from "@/components/profile/student-danger-panel";
import { StudentProfileTabs, type StudentProfileTabId } from "@/components/profile/student-profile-tabs";
import { WorkflowPanel } from "@/components/profile/workflow-panel";
import { canUserAccessModule } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { formatInr } from "@/lib/currency";
import { formatEnumLabel } from "@/lib/display";
import { StatusBadge } from "@/components/ui/status-badge";
import { getStudentProfile } from "@/lib/services/student-service";
import type { OperationsPanelPartialMode } from "@/components/profile/operations-panel";
import { readAppLanguage } from "@/lib/i18n-server";

function DetailCard({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <section className="surface p-6">
      <h3 className="font-serif text-2xl font-semibold tracking-tight">{title}</h3>
      <div className="mt-4 grid gap-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
            <p className="mt-2 text-sm font-medium text-slate-800">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  helper
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <article className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-[0.24em] text-white/70">{label}</p>
      <p className="mt-3 font-serif text-3xl font-semibold tracking-tight text-white">{value}</p>
      {helper ? <p className="mt-2 text-xs leading-5 text-white/75">{helper}</p> : null}
    </article>
  );
}

function resolveProfileTab(
  raw: string | undefined,
  visibility: {
    documents: boolean;
    undertaking: boolean;
    scvt: boolean;
    prn: boolean;
    scholarship: boolean;
    feesExam: boolean;
  }
): StudentProfileTabId {
  if (!raw || raw === "overview") return "overview";
  if (raw === "documents" && visibility.documents) return "documents";
  if (raw === "undertaking" && visibility.undertaking) return "undertaking";
  if (raw === "scvt" && visibility.scvt) return "scvt";
  if (raw === "prn" && visibility.prn) return "prn";
  if (raw === "scholarship" && visibility.scholarship) return "scholarship";
  if (raw === "fees-exam" && visibility.feesExam) return "fees-exam";
  return "overview";
}

function tabToPartialMode(tab: StudentProfileTabId): OperationsPanelPartialMode | undefined {
  if (tab === "undertaking") return "undertaking";
  if (tab === "scvt") return "scvt";
  if (tab === "prn") return "prn";
  if (tab === "scholarship") return "scholarship";
  if (tab === "fees-exam") return "fees-exam";
  return undefined;
}

export default async function StudentProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentUser = await requireUser();
  const lang = await readAppLanguage();
  const { studentId } = await params;
  const query = await searchParams;
  const rawTab = typeof query.tab === "string" ? query.tab : undefined;
  const profile = await getStudentProfile(studentId);

  if (!profile) notFound();

  const visibility = {
    documents: canUserAccessModule(currentUser, "documents"),
    undertaking: canUserAccessModule(currentUser, "undertaking"),
    scvt: canUserAccessModule(currentUser, "scvt"),
    prn: canUserAccessModule(currentUser, "prn"),
    scholarship: canUserAccessModule(currentUser, "scholarship"),
    feesExam: canUserAccessModule(currentUser, "fees") || canUserAccessModule(currentUser, "exam-status")
  };

  const activeTab = resolveProfileTab(rawTab, visibility);
  const operationsProps = {
    studentId: profile.id,
    currentUserRole: currentUser.role,
    initialFees: profile.fees,
    initialScholarship: profile.scholarship,
    initialPrnScvt: profile.prnScvt,
    initialExamStatus: profile.examStatus,
    initialUndertaking: profile.undertaking
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-700 p-8 text-white shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/65">Student Profile</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl border border-white/20 bg-white/10 text-lg font-semibold text-white">
                {profile.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={profile.fullName} className="h-full w-full object-cover" src={profile.photoUrl} />
                ) : (
                  profile.fullName.slice(0, 1).toUpperCase()
                )}
              </div>
              <h2 className="font-serif text-4xl font-semibold tracking-tight">{profile.fullName}</h2>
            </div>
            <p className="mt-3 text-sm text-white/80">
              {profile.studentCode} • {profile.instituteName} ({profile.instituteCode}) • {profile.tradeName} • Unit{" "}
              {profile.unitNumber || "Not set"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge prefix="Student" status={profile.status} />
              <StatusBadge prefix="Documents" status={profile.workflow.documentsStatus} />
              <StatusBadge prefix="Fees" status={profile.fees?.paymentStatus || "UNPAID"} />
              <StatusBadge prefix="Scholarship" status={profile.scholarship?.status || "NOT_APPLIED"} />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white" href={`/admissions/${profile.id}`}>
              Print Admission Form
            </Link>
            <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white" href={`/students/${profile.id}/print`}>
              Print Profile
            </Link>
            <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white" href={`/id-cards/${profile.id}`}>
              Print ID Card
            </Link>
            <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white" href="/modules/students">
              Back to directory
            </Link>
            <Link className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900" href="/">
              Back to dashboard
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Session" value={profile.session} helper={`Year ${profile.yearLabel}`} />
          <SummaryCard label="Due Amount" value={formatInr(profile.fees?.dueAmount || "0")} helper={formatEnumLabel(profile.fees?.paymentStatus || "UNPAID")} />
          <SummaryCard label="Documents" value={formatEnumLabel(profile.workflow.documentsStatus)} helper={`${profile.documents.length} uploaded records`} />
          <SummaryCard
            label="Next Step"
            value={formatEnumLabel(profile.workflow.nextStudentStatus)}
            helper={profile.workflow.blockers.length ? `${profile.workflow.blockers.length} blockers active` : "No blockers right now"}
          />
        </div>
      </section>

      <StudentProfileTabs active={activeTab} lang={lang} studentId={profile.id} visibility={visibility} />

      {activeTab === "overview" ? (
        <>
          <div className="grid gap-6 xl:grid-cols-3">
            <DetailCard
              title="Overview"
              items={[
                ["Session", profile.session],
                ["Year", profile.yearLabel],
                ["Unit", profile.unitNumber || "Not provided"],
                ["Status", formatEnumLabel(profile.status)],
                ["Mobile", profile.mobile],
                ["Email", profile.email || "Not provided"],
                ["Student Aadhaar", profile.aadhaarMasked || "Not available"]
              ]}
            />

            <DetailCard
              title="Parent"
              items={[
                ["Relation", profile.parent?.relation || "Not provided"],
                ["Name", profile.parent?.name || "Not provided"],
                ["Mobile", profile.parent?.mobile || "Not provided"],
                ["Parent Aadhaar", profile.parent?.aadhaarMasked || "Not provided"]
              ]}
            />

            <DetailCard
              title="Eligibility"
              items={[
                ["Board", profile.education?.boardUniversity || "Not provided"],
                ["Roll Number", profile.education?.rollNumber || "Not provided"],
                ["Passing Year", profile.education?.passingYear ? String(profile.education.passingYear) : "Not provided"],
                ["Percentage", profile.education?.percentage || "Not provided"],
                ["10th Passed", profile.education?.isPassed ? "Yes" : "No"],
                ["Verification", formatEnumLabel(profile.education?.verificationStatus || "Pending")]
              ]}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <DetailCard
              title="Fees"
              items={[
                ["Final Fees", formatInr(profile.fees?.finalFees || "0")],
                ["Paid", formatInr(profile.fees?.paidAmount || "0")],
                ["Due", formatInr(profile.fees?.dueAmount || "0")],
                ["Payment Status", formatEnumLabel(profile.fees?.paymentStatus || "UNPAID")],
                ["Payment Mode", formatEnumLabel(profile.paymentMode || "Not set")]
              ]}
            />

            <DetailCard
              title="Scholarship"
              items={[
                ["Status", formatEnumLabel(profile.scholarship?.status || "NOT_APPLIED")],
                ["Scholarship ID", profile.scholarship?.scholarshipId || "Not assigned"],
                ["Income Certificate No.", profile.scholarship?.incomeCertificateNumber || "Not provided"],
                ["Query", profile.scholarship?.queryText || "No query"]
              ]}
            />

            <DetailCard
              title="Exam / Registration / Undertaking"
              items={[
                ["Practical Result", formatEnumLabel(profile.examStatus?.tradePracticalResult || "NOT_DECLARED")],
                ["Theory Result", formatEnumLabel(profile.examStatus?.onlineTheoryResult || "NOT_DECLARED")],
                ["Practical Appearance", formatEnumLabel(profile.examStatus?.practicalExamAppearance || "NOT_APPEARED")],
                ["Practical Attempts", String(profile.examStatus?.practicalAttemptCount || 0)],
                ["Theory Attempts", String(profile.examStatus?.theoryAttemptCount || 0)],
                ["Ent. Roll No.", profile.prnScvt?.entRollNumber || "Pending"],
                ["Admission Status", profile.prnScvt?.admissionStatus || "Pending"],
                ["PRN", profile.prnScvt?.prnNumber || "Pending"],
                ["SCVT", profile.prnScvt?.scvtRegistrationNumber || "Pending"],
                ["PRN/SCVT Status", formatEnumLabel(profile.prnScvt?.verificationStatus || "PENDING")],
                ["Undertaking Status", formatEnumLabel(profile.undertaking?.generationStatus || "PENDING")],
                ["Print Count", String(profile.undertaking?.printCount || 0)],
                [
                  "Signed Status",
                  profile.undertaking?.signedDocumentUrl && (profile.undertaking?.signedStatus || "PENDING") === "PENDING"
                    ? "Pending Admin Approval"
                    : formatEnumLabel(profile.undertaking?.signedStatus || "PENDING")
                ]
              ]}
            />
          </div>

          <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <WorkflowPanel workflow={profile.workflow} />
            <div className="space-y-6">
              <section className="surface p-6">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Student Snapshot</p>
                <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Current Case Readiness</h3>
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Admission Desk</p>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {profile.education?.isPassed ? "10th eligibility captured." : "10th eligibility still needs attention."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Finance Desk</p>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {Number(profile.fees?.dueAmount || 0) > 0 ? `Outstanding due ${formatInr(profile.fees?.dueAmount || "0")}.` : "No fee due right now."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Exam Desk</p>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {(profile.examStatus?.tradePracticalResult === "FAIL" && !profile.examStatus?.practicalEligibleReappear) ||
                      (profile.examStatus?.onlineTheoryResult === "FAIL" && !profile.examStatus?.theoryEligibleReappear)
                        ? "Re-appear limit exhausted for one of the exams."
                        : "Exam status and re-appear tracking available."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Registration Desk</p>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {profile.prnScvt?.prnNumber && profile.prnScvt?.scvtRegistrationNumber ? "PRN and SCVT recorded." : "PRN or SCVT details still pending."}
                    </p>
                  </div>
                </div>
              </section>

              <StudentDangerPanel studentCode={profile.studentCode} studentId={profile.id} />
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "documents" && visibility.documents ? (
        <DocumentPanel initialDocuments={profile.documents} studentId={profile.id} />
      ) : null}

      {activeTab !== "overview" && activeTab !== "documents" && tabToPartialMode(activeTab) ? (
        <OperationsPanel {...operationsProps} partialMode={tabToPartialMode(activeTab)} />
      ) : null}
    </div>
  );
}
