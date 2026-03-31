import { notFound } from "next/navigation";
import { StaffIdCardPrintActions } from "@/components/id-cards/staff-id-card-print-actions";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getIdCardRegisterEntry } from "@/lib/id-card-register";
import { prisma } from "@/lib/prisma";
import { readInstituteBrandingConfig } from "@/lib/institute-branding-config";
import { buildQrImageUrl } from "@/lib/qr";

function formatDate(value?: Date | null) {
  return value ? value.toLocaleDateString("en-IN") : "Not Provided";
}

export default async function StaffIdCardPage({ params }: { params: Promise<{ staffId: string }> }) {
  const user = await requireUser();
  assertUserActionAccess(user, "hr", "view");
  const { staffId } = await params;

  const [staff, institutes, brandingConfig, registerEntry] = await Promise.all([
    prisma.hrStaff.findUnique({
      where: { id: staffId },
      include: {
        qualifications: {
          orderBy: [{ passingYear: "desc" }, { createdAt: "desc" }]
        }
      }
    }),
    prisma.institute.findMany({
      where: { status: true },
      orderBy: { instituteCode: "asc" }
    }),
    readInstituteBrandingConfig(),
    getIdCardRegisterEntry("staff", staffId)
  ]);

  if (!staff) notFound();

  const primaryBranding = brandingConfig.institutes[0] || null;
  const displayInstitutes = institutes.length ? institutes : [];
  const instituteTitle =
    displayInstitutes.length === 1
      ? displayInstitutes[0].name
      : displayInstitutes.length > 1
        ? displayInstitutes.map((item) => item.name).join(" / ")
        : "Institute Operations Portal";
  const campusLine =
    primaryBranding?.campusName ||
    displayInstitutes.map((item) => item.address).filter(Boolean).join(" / ") ||
    "Campus detail not set";
  const logoUrl = primaryBranding?.logoUrl || "/portal-logo.png";
  const sealUrl = primaryBranding?.sealUrl || "";
  const signatureUrl = primaryBranding?.signatureUrl || "";
  const qrImageUrl = buildQrImageUrl(staff.employeeCode);
  const mainQualification =
    staff.qualifications[0]?.level?.replaceAll("_", " ") ||
    staff.technicalQualification ||
    staff.academicQualification ||
    "Not Provided";

  return (
    <div className="id-card-print-page mx-auto max-w-5xl bg-stone-50 p-6 print:bg-white print:p-0">
      <section className="id-card-grid grid gap-6 md:grid-cols-2">
        <article className="id-card-face overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm print:break-inside-avoid">
          <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-cyan-700 p-6 text-white">
            <div className="flex items-start gap-4">
              <img alt="Institute logo" className="h-20 w-20 rounded-2xl bg-white/10 object-contain p-2" src={logoUrl} />
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-white/70">Staff Identity Card</p>
                <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight">{instituteTitle}</h1>
                <p className="mt-1 text-sm text-white/80">{campusLine}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-6">
            <div className="flex items-start gap-5">
              <div className="flex h-32 w-28 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                {staff.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={staff.fullName} className="h-full w-full object-cover" src={staff.photoUrl} />
                ) : (
                  <span className="text-4xl font-semibold text-slate-400">{staff.fullName.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className="grid flex-1 gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Staff Name</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{staff.fullName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Employee Code</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{staff.employeeCode}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Designation / Department</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {staff.designation || "Not Provided"} • {staff.department || "Not Provided"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Mobile</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{staff.mobile || "Not Provided"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Date of Birth</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(staff.dateOfBirth)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Joining Date</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(staff.joiningDate)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Employment Status</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{staff.employmentStatus.replaceAll("_", " ")}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Card Number</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{registerEntry?.cardNumber || "Will assign on first print"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Issue Version</p>
                <p className="mt-1 text-sm font-medium text-slate-900">V{registerEntry?.issueVersion || 1}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 print:hidden">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">ID Card Prints</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{registerEntry?.printCount || 0}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 print:hidden">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Last Printed</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {registerEntry?.lastPrintedAt ? new Date(registerEntry.lastPrintedAt).toLocaleString("en-IN") : "Not Printed"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 print:hidden">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Latest Print Reason</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{registerEntry?.lastReason || "Initial Issue"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 print:hidden">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Printed By</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{registerEntry?.lastPrintedBy || "Not Printed"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 print:hidden">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Card Status</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{registerEntry?.status || "ACTIVE"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 print:hidden">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status Note</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{registerEntry?.statusNote || "-"}</p>
              </div>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div className="text-xs text-slate-500">
                <p>{primaryBranding?.contactPhone || "Institute contact not set"}</p>
                <p>{primaryBranding?.contactEmail || "Institute email not set"}</p>
              </div>
              <div className="text-right">
                {signatureUrl ? <img alt="Authorized signature" className="ml-auto h-14 w-auto object-contain" src={signatureUrl} /> : null}
                <p className="mt-2 border-t border-slate-300 pt-2 text-xs text-slate-600">{primaryBranding?.signatureLabel || "Authorized Signatory"}</p>
              </div>
            </div>
          </div>
        </article>

        <article className="id-card-face overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm print:break-inside-avoid">
          <div className="bg-slate-100 p-6">
            <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Back Side</p>
            <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-slate-900">Employment Identity Details</h2>
          </div>

          <div className="grid gap-4 p-6">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Address</p>
              <p className="mt-2 text-sm text-slate-800">{staff.addressLine || "Not Provided"}</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Category / Qualification</p>
              <div className="mt-2 space-y-1 text-sm text-slate-800">
                <p>Staff Category: {staff.staffCategory.replaceAll("_", " ")}</p>
                <p>Main Qualification: {mainQualification}</p>
                <p>CTI Holder: {staff.isCtiHolder ? "Yes" : "No"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Institute Information</p>
              <div className="mt-2 space-y-1 text-sm text-slate-800">
                <p>Card No.: {registerEntry?.cardNumber || "Pending First Print"}</p>
                <p>Issue Version: V{registerEntry?.issueVersion || 1}</p>
                {displayInstitutes.length ? (
                  displayInstitutes.map((item) => (
                    <p key={item.id}>
                      {item.instituteCode}: {item.name} • SCVT {item.scvtCode || "Not Set"}
                    </p>
                  ))
                ) : (
                  <p>Institute master not configured.</p>
                )}
                <p>NCVT Code: {primaryBranding?.ncvtCode || "Not Set"}</p>
                <p>Affiliation No.: {primaryBranding?.affiliationNumber || "Not Set"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Instructions</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-800">
                <li>Carry this card during institute duty, office work, and examinations.</li>
                <li>This card should be returned to the institute when service ends.</li>
                <li>Loss of this card must be reported to the office immediately.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Attendance QR</p>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">{staff.employeeCode}</p>
                  <p className="mt-1 text-xs text-slate-500">Scan this QR in the attendance module.</p>
                </div>
                <img alt={`QR for ${staff.employeeCode}`} className="h-20 w-20 rounded-2xl border border-slate-200 bg-white p-2 object-contain" src={qrImageUrl} />
              </div>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div className="text-xs text-slate-500">
                <p>{primaryBranding?.website || "Website not set"}</p>
                <p>{primaryBranding?.certificateFooterText || "Institute print identity active"}</p>
              </div>
              {sealUrl ? <img alt="Institute seal" className="h-20 w-20 object-contain" src={sealUrl} /> : null}
            </div>
          </div>
        </article>
      </section>

      {registerEntry?.status && registerEntry.status !== "ACTIVE" ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 print:hidden">
          This card is currently marked as {registerEntry.status.toLowerCase()}. Reactivate it from the ID card register before printing again.
        </section>
      ) : null}

      <StaffIdCardPrintActions staffId={staff.id} printCount={registerEntry?.printCount || 0} status={registerEntry?.status || "ACTIVE"} />
    </div>
  );
}
