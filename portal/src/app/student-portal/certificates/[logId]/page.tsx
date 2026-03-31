import { notFound } from "next/navigation";
import { PortalPrintActions } from "@/components/portal/portal-print-actions";
import { requireStudentUser } from "@/lib/student-auth";
import { getCertificatePrintData } from "@/lib/services/certificate-service";
import { getInstituteBrandingByCode } from "@/lib/institute-branding-config";

function formatDate(value?: Date | null) {
  return value ? value.toLocaleDateString("en-IN") : "Not provided";
}

function titleForType(type: string) {
  switch (type) {
    case "BONAFIDE":
      return "Bonafide Certificate";
    case "CHARACTER":
      return "Character Certificate";
    case "NO_DUES":
      return "No Dues Certificate";
    case "PRACTICAL_PERMISSION":
      return "Practical Permission Slip";
    case "HALL_TICKET":
      return "Hall Ticket";
    default:
      return "Certificate";
  }
}

function bodyForType(type: string, data: any) {
  const student = data.student;
  const parent = student.parents[0];
  const noDuesSummary = student.noDuesClearances.every((item: { isCleared: boolean }) => item.isCleared)
    ? "All listed departments have cleared the student for release."
    : "Some department clearances are still pending.";

  switch (type) {
    case "BONAFIDE":
      return `This is to certify that ${student.fullName}, student code ${student.studentCode}, is/was a bona fide student of ${student.institute.name} in trade ${student.trade.name} for session ${student.session} (${student.yearLabel}). This certificate is issued on request for official use.`;
    case "CHARACTER":
      return `This is to certify that ${student.fullName}, ${parent ? `${parent.relation.toLowerCase()} ${parent.name},` : ""} student of ${student.institute.name}, trade ${student.trade.name}, session ${student.session}, has maintained conduct on institute record to the best of current office knowledge. This certificate is issued for official use only.`;
    case "NO_DUES":
      return `This is to certify that ${student.fullName}, student code ${student.studentCode}, trade ${student.trade.name}, session ${student.session}, has been reviewed under the institute no dues checklist. ${noDuesSummary}`;
    case "PRACTICAL_PERMISSION":
      return `This is to certify that ${student.fullName}, student code ${student.studentCode}, trade ${student.trade.name}, session ${student.session}, is permitted by the institute to appear in the practical examination as per the current office record and eligibility decision.`;
    case "HALL_TICKET":
      return `This hall ticket is issued to ${student.fullName}, student code ${student.studentCode}, trade ${student.trade.name}, session ${student.session} (${student.yearLabel}), for institute examination use as per the current eligibility, exam fee, and no-dues record on issue date.`;
    default:
      return "";
  }
}

export default async function StudentPortalCertificatePage({ params }: { params: Promise<{ logId: string }> }) {
  const user = await requireStudentUser();
  const { logId } = await params;
  const log = await getCertificatePrintData(logId);
  if (!log || log.studentId !== user.id) notFound();

  const student = log.student;
  const branding = await getInstituteBrandingByCode(student.institute.instituteCode);
  const logoUrl = branding?.logoUrl || "/portal-logo.png";
  const sealUrl = branding?.sealUrl || "";
  const signatureUrl = branding?.signatureUrl || "";
  const signatureLabel = branding?.signatureLabel || "Institute Office";
  const certificateFooterText =
    branding?.certificateFooterText || "This is a system-issued institute certificate for official use.";

  return (
    <div className="mx-auto max-w-4xl bg-stone-50 p-6 print:bg-white print:p-0">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-start gap-4">
            <img alt="Institute logo" className="h-20 w-20 object-contain" src={logoUrl} />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Student Portal Certificate</p>
              <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-slate-900">{student.institute.name}</h1>
              <p className="mt-1 text-sm text-slate-600">{branding?.campusName || student.institute.address || "Campus detail not set"}</p>
              <p className="mt-2 text-sm text-slate-600">{titleForType(log.certificateType)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Certificate No</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{log.certificateNumber}</p>
            <p className="mt-2 text-sm text-slate-600">{formatDate(log.issueDate)}</p>
            <p className="mt-2 text-xs text-slate-500">Verify Code: {log.verificationCode}</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-center font-serif text-3xl font-semibold tracking-tight text-slate-900">{titleForType(log.certificateType)}</h2>
          <p className="mt-6 text-sm leading-8 text-slate-800">{bodyForType(log.certificateType, log)}</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Student Details</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{student.fullName}</p>
            <p className="mt-1 text-sm text-slate-600">{student.studentCode}</p>
            <p className="mt-1 text-sm text-slate-600">{student.trade.name}</p>
            <p className="mt-1 text-sm text-slate-600">{student.session} • {student.yearLabel}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Issue Details</p>
            <p className="mt-2 text-sm text-slate-700">Print Count: {log.printCount}</p>
            <p className="mt-1 text-sm text-slate-700">Last Printed: {formatDate(log.lastPrintedAt)}</p>
            <p className="mt-1 text-sm text-slate-700">Issue Note: {log.note || "Institute issue record"}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Verification</p>
            <p className="mt-2 text-sm text-slate-700">Use verification code <span className="font-semibold text-slate-900">{log.verificationCode}</span> for institute verification.</p>
            <p className="mt-4 text-xs text-slate-500">{certificateFooterText}</p>
          </div>
          <div className="rounded-3xl border border-dashed border-slate-300 bg-stone-50 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Authorized Signature</p>
            {signatureUrl ? <img alt="Authorized signature" className="mt-6 h-16 w-auto object-contain" src={signatureUrl} /> : null}
            <div className="mt-12 border-t border-slate-300 pt-3 text-sm text-slate-600">{signatureLabel}</div>
            {sealUrl ? <img alt="Institute seal" className="mt-4 h-16 w-16 object-contain" src={sealUrl} /> : null}
          </div>
        </div>

        <PortalPrintActions backHref="/student-portal" />
      </section>
    </div>
  );
}
