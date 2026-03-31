import Link from "next/link";
import { notFound } from "next/navigation";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { UndertakingPrintActions } from "@/components/profile/undertaking-print-actions";
import { prisma } from "@/lib/prisma";
import { getInstituteBrandingByCode } from "@/lib/institute-branding-config";
import { formatUndertakingStatusLabel, readUndertakingTemplate, renderUndertakingTemplate } from "@/lib/undertaking-template";

export default async function UndertakingPrintPage({ params }: { params: Promise<{ studentId: string }> }) {
  const user = await requireUser();
  assertUserActionAccess(user, "undertaking", "view");
  const { studentId } = await params;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      institute: true,
      trade: true,
      parents: true,
      feeProfile: true,
      scholarshipRecord: true,
      prnScvtRecord: true,
      undertakingRecord: true
    }
  });

  if (!student) notFound();
  const parent = student.parents[0] || null;
  const branding = await getInstituteBrandingByCode(student.institute.instituteCode);
  const templateConfig = await readUndertakingTemplate();
  const renderedTemplate = renderUndertakingTemplate(templateConfig.template, {
    undertaking_code: student.undertakingRecord?.verificationCode || "Pending",
    instituteName: student.institute.name,
    instituteCode: student.institute.instituteCode,
    instituteAddress: student.institute.address || "Not provided",
    authorizedSignatory: "______________________________",
    place: "Varanasi, Uttar Pradesh",
    studentName: student.fullName,
    studentCode: student.studentCode,
    tradeName: student.trade.name,
    session: student.session,
    yearLabel: student.yearLabel,
    studentMobile: student.mobile,
    studentEmail: student.email || "Not provided",
    studentAadhaar: student.aadhaarMasked || "Not provided",
    studentAddress: student.address || "Not provided",
    fatherName: student.fatherName || "Not provided",
    motherName: student.motherName || "Not provided",
    parentName: parent?.name || "Not provided",
    parentRelation: parent?.relation ? formatUndertakingStatusLabel(parent.relation) : "Not provided",
    parentMobile: parent?.mobile || "Not provided",
    parentAadhaar: parent?.aadhaarMasked || "Not provided",
    prnNumber: student.prnScvtRecord?.prnNumber || "Pending",
    scvtNumber: student.prnScvtRecord?.scvtRegistrationNumber || "Pending",
    scholarshipStatus: student.scholarshipRecord?.status ? formatUndertakingStatusLabel(student.scholarshipRecord.status) : "Not Applied",
    scholarshipId: student.scholarshipRecord?.scholarshipId || "Pending",
    feesIfScholarship: student.feeProfile?.feesIfScholarship?.toString() || "0.00",
    feesIfNoScholarship: student.feeProfile?.feesIfNoScholarship?.toString() || student.feeProfile?.instituteDecidedFee?.toString() || "0.00",
    finalFee: student.feeProfile?.finalFees?.toString() || "0.00",
    paymentStatus: student.feeProfile?.paymentStatus ? formatUndertakingStatusLabel(student.feeProfile.paymentStatus) : "Unpaid",
    dueAmount: student.feeProfile?.dueAmount?.toString() || "0.00",
    currentDate: new Date().toLocaleDateString("en-IN")
  });

  return (
    <div className="mx-auto max-w-4xl bg-stone-50 p-6 print:bg-white print:p-0">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-start gap-4">
            <img alt="Institute logo" className="h-20 w-20 object-contain" src={branding?.logoUrl || "/portal-logo.png"} />
            <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Undertaking Print View</p>
            <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-slate-900">{student.institute.name}</h1>
            <p className="mt-1 text-sm text-slate-600">{branding?.campusName || student.institute.address || "Campus detail not set"}</p>
            <p className="mt-2 text-sm text-slate-600">Prefilled print-only format for staff. Template changes are controlled by admin from Settings.</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Undertaking Code</p>
            <p className="mt-1 text-base font-semibold text-emerald-800">{student.undertakingRecord?.verificationCode || "Pending"}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Student Code</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{student.studentCode}</p>
            <p className="mt-2 text-sm text-slate-600">{student.session} • {student.yearLabel}</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-8 text-slate-800">{renderedTemplate}</pre>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Authorized Signature</p>
            {branding?.signatureUrl ? <img alt="Authorized signature" className="mt-4 h-16 w-auto object-contain" src={branding.signatureUrl} /> : null}
            <p className="mt-3 border-t border-slate-300 pt-2 text-sm text-slate-600">{branding?.signatureLabel || "Authorized Signatory"}</p>
            {branding?.certificateFooterText ? <p className="mt-3 text-xs text-slate-500">{branding.certificateFooterText}</p> : null}
          </div>
          {branding?.sealUrl ? <img alt="Institute seal" className="h-20 w-20 object-contain" src={branding.sealUrl} /> : null}
        </div>

        <UndertakingPrintActions studentId={student.id} />
      </section>
    </div>
  );
}
