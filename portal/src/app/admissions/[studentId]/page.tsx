import { notFound } from "next/navigation";
import { AdmissionPrintActions } from "@/components/admissions/admission-print-actions";
import { requireUser } from "@/lib/auth";
import { formatEnumLabel } from "@/lib/display";
import { getStudentProfile } from "@/lib/services/student-service";

function PrintTable({
  title,
  rows
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm print:rounded-none print:border-none print:shadow-none">
      <h2 className="font-serif text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-100">
        <table className="min-w-full text-left text-sm">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-t border-slate-100 first:border-t-0">
                <th className="w-[34%] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</th>
                <td className="px-4 py-3 text-slate-800">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function AdmissionPrintPage({ params }: { params: Promise<{ studentId: string }> }) {
  await requireUser();
  const { studentId } = await params;
  const profile = await getStudentProfile(studentId);

  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-5xl bg-stone-50 p-6 print:bg-white print:p-0">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Admission Print</p>
            <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-slate-950">Admission Form</h1>
            <p className="mt-3 text-sm text-slate-600">
              {profile.instituteName} ({profile.instituteCode}) • {profile.tradeName}
            </p>
          </div>
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={profile.fullName} className="h-28 w-24 rounded-2xl border border-slate-200 object-cover" src={profile.photoUrl} />
          ) : null}
        </div>

        <div className="mt-6 grid gap-6">
          <PrintTable
            title="Student Profile"
            rows={[
              ["Admission Number", profile.admissionNumber || profile.studentCode],
              ["Enrollment / Registration No.", profile.enrollmentNumber || "-"],
              ["Student ID", profile.studentCode],
              ["Student Name", profile.fullName],
              ["Father Name", profile.fatherName || "-"],
              ["Mother Name", profile.motherName || "-"],
              ["Gender", formatEnumLabel(profile.gender || "NOT_PROVIDED")],
              ["Date of Birth", profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString("en-IN") : "-"],
              ["Mobile", profile.mobile],
              ["Alternate Mobile", profile.alternateMobile || "-"],
              ["Email", profile.email || "-"],
              ["Address", profile.address || "-"],
              ["Category", profile.category || "-"],
              ["Caste", profile.caste || "-"],
              ["Religion", profile.religion || "-"],
              ["Income Details", profile.incomeDetails || "-"],
              ["Domicile Details", profile.domicileDetails || "-"],
              ["Minority Status", profile.minorityStatus ? "Yes" : "No"],
              ["Disability Status", profile.disabilityStatus ? "Yes" : "No"],
              ["Marital Status", profile.maritalStatus || "-"]
            ]}
          />

          <PrintTable
            title="Admission Details"
            rows={[
              ["Institute", profile.instituteName],
              ["Trade", profile.tradeName],
              ["Unit", profile.unitNumber || "-"],
              ["Session", profile.session],
              ["Year / Semester", profile.yearLabel],
              ["Admission Date", profile.admissionDate ? new Date(profile.admissionDate).toLocaleDateString("en-IN") : "-"],
              ["Admission Type", profile.admissionType || "-"],
              ["Admission Status", profile.admissionStatusLabel || profile.status],
              ["Seat Type", profile.seatType || "-"],
              ["Roll Number", profile.rollNumber || "-"],
              ["Batch", profile.batchLabel || "-"],
              ["Shift", profile.shiftLabel || "-"]
            ]}
          />

          <PrintTable
            title="Previous Education"
            rows={[
              ["Qualification", profile.education ? "Available" : "-"],
              ["School Name", profile.education?.schoolName || "-"],
              ["Board / University", profile.education?.boardUniversity || "-"],
              ["Certificate Details", profile.education?.certificateNumber || "-"],
              ["Roll Number", profile.education?.rollNumber || "-"],
              ["Passing Year", profile.education?.passingYear ? String(profile.education.passingYear) : "-"],
              ["Percentage / Marks", profile.education?.percentage || "-"],
              ["10th Eligibility", profile.education?.isPassed ? "Passed" : "Not Passed"],
              ["Verification", formatEnumLabel(profile.education?.verificationStatus || "PENDING")]
            ]}
          />
        </div>

        <AdmissionPrintActions />
      </section>
    </div>
  );
}
