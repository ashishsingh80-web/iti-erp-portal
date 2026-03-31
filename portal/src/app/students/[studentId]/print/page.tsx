import { notFound } from "next/navigation";
import { StudentProfilePrintActions } from "@/components/profile/student-profile-print-actions";
import { requireUser } from "@/lib/auth";
import { formatEnumLabel } from "@/lib/display";
import { getStudentProfile } from "@/lib/services/student-service";

function Section({
  title,
  items
}: {
  title: string;
  items: Array<[string, string]>;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm print:rounded-none print:border-none print:shadow-none">
      <h2 className="font-serif text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
            <p className="mt-2 text-sm font-medium text-slate-800">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function StudentProfilePrintPage({ params }: { params: Promise<{ studentId: string }> }) {
  await requireUser();
  const { studentId } = await params;
  const profile = await getStudentProfile(studentId);

  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-5xl bg-stone-50 p-6 print:bg-white print:p-0">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Student Profile Print</p>
            <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-slate-950">{profile.fullName}</h1>
            <p className="mt-3 text-sm text-slate-600">
              {profile.studentCode} • {profile.instituteName} ({profile.instituteCode}) • {profile.tradeName}
            </p>
          </div>
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={profile.fullName} className="h-28 w-24 rounded-2xl border border-slate-200 object-cover" src={profile.photoUrl} />
          ) : null}
        </div>

        <div className="mt-6 grid gap-6">
          <Section
            title="Overview"
            items={[
              ["Admission No.", profile.admissionNumber || profile.studentCode],
              ["Enrollment No.", profile.enrollmentNumber || "-"],
              ["Session", profile.session],
              ["Year", profile.yearLabel],
              ["Unit", profile.unitNumber || "-"],
              ["Admission Status", profile.admissionStatusLabel || profile.status],
              ["Lifecycle", formatEnumLabel(profile.status)],
              ["Trade", profile.tradeName]
            ]}
          />

          <Section
            title="Personal Details"
            items={[
              ["Father Name", profile.fatherName || "-"],
              ["Mother Name", profile.motherName || "-"],
              ["Mobile", profile.mobile],
              ["Alternate Mobile", profile.alternateMobile || "-"],
              ["Email", profile.email || "-"],
              ["Gender", formatEnumLabel(profile.gender || "NOT_PROVIDED")],
              ["Category", profile.category || "-"],
              ["Caste", profile.caste || "-"],
              ["Religion", profile.religion || "-"],
              ["Address", profile.address || "-"]
            ]}
          />

          <Section
            title="Academic / Finance / Compliance"
            items={[
              ["Board", profile.education?.boardUniversity || "-"],
              ["Passing Year", profile.education?.passingYear ? String(profile.education.passingYear) : "-"],
              ["Percentage", profile.education?.percentage || "-"],
              ["Fees Due", profile.fees?.dueAmount || "0"],
              ["Fee Status", formatEnumLabel(profile.fees?.paymentStatus || "UNPAID")],
              ["Scholarship Status", formatEnumLabel(profile.scholarship?.status || "NOT_APPLIED")],
              ["PRN", profile.prnScvt?.prnNumber || "-"],
              ["SCVT", profile.prnScvt?.scvtRegistrationNumber || "-"],
              ["Documents", formatEnumLabel(profile.workflow.documentsStatus)],
              ["Eligibility", formatEnumLabel(profile.education?.verificationStatus || "PENDING")]
            ]}
          />
        </div>

        <StudentProfilePrintActions />
      </section>
    </div>
  );
}
