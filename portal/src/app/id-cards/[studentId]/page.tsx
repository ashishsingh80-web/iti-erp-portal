import { notFound } from "next/navigation";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { IdCardPrintActions } from "@/components/id-cards/id-card-print-actions";
import { getIdCardRegisterEntry } from "@/lib/id-card-register";
import { prisma } from "@/lib/prisma";
import { getInstituteBrandingByCode } from "@/lib/institute-branding-config";
import { buildQrImageUrl } from "@/lib/qr";

function formatDate(value?: Date | null) {
  return value ? value.toLocaleDateString("en-IN") : "Not Provided";
}

export default async function IdCardPage({ params }: { params: Promise<{ studentId: string }> }) {
  const user = await requireUser();
  assertUserActionAccess(user, "students", "view");
  const { studentId } = await params;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      institute: true,
      trade: true,
      parents: true,
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!student) notFound();

  const [branding, registerEntry] = await Promise.all([
    getInstituteBrandingByCode(student.institute.instituteCode),
    getIdCardRegisterEntry("student", student.id)
  ]);
  const photoUrl = student.documents.find((item) => item.documentType === "STUDENT_PHOTO")?.fileUrl || null;
  const logoUrl = branding?.logoUrl || "/portal-logo.png";
  const sealUrl = branding?.sealUrl || "";
  const signatureUrl = branding?.signatureUrl || "";
  const parent = student.parents[0] || null;
  const qrImageUrl = buildQrImageUrl(student.studentCode);

  return (
    <div className="id-card-print-page mx-auto max-w-5xl bg-stone-50 p-6 print:bg-white print:p-0">
      <section className="id-card-grid grid gap-6 md:grid-cols-2">
        <article className="id-card-face overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm print:break-inside-avoid">
          <div className="bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-700 p-6 text-white">
            <div className="flex items-start gap-4">
              <img alt="Institute logo" className="h-20 w-20 rounded-2xl bg-white/10 object-contain p-2" src={logoUrl} />
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-white/70">Student Identity Card</p>
                <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight">{student.institute.name}</h1>
                <p className="mt-1 text-sm text-white/80">{branding?.campusName || student.institute.address || "Campus detail not set"}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-6">
            <div className="flex items-start gap-5">
              <div className="flex h-32 w-28 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={student.fullName} className="h-full w-full object-cover" src={photoUrl} />
                ) : (
                  <span className="text-4xl font-semibold text-slate-400">{student.fullName.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className="grid flex-1 gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Student Name</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{student.fullName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Student Code</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{student.studentCode}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Session</p>
                  <p className="mt-1 text-sm text-slate-700">{student.session}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Father Name</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{parent?.name || "Not Provided"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Mobile</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{student.mobile}</p>
              </div>
            </div>
          </div>
        </article>

        <article className="id-card-face overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm print:break-inside-avoid">
          <div className="bg-slate-100 p-6">
            <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Back Side</p>
            <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-slate-900">Institute Identity Details</h2>
          </div>

          <div className="grid gap-4 p-6">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Address</p>
              <p className="mt-2 text-sm text-slate-800">{student.address || student.institute.address || "Not Provided"}</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Emergency Contact</p>
              <p className="mt-2 text-sm text-slate-800">{parent?.mobile || student.mobile}</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Attendance QR</p>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">{student.studentCode}</p>
                  <p className="mt-1 text-xs text-slate-500">Scan this QR in the attendance module.</p>
                </div>
                <img alt={`QR for ${student.studentCode}`} className="h-20 w-20 rounded-2xl border border-slate-200 bg-white p-2 object-contain" src={qrImageUrl} />
              </div>
            </div>

            {sealUrl ? (
              <div className="flex justify-end">
                <img alt="Institute seal" className="h-16 w-16 object-contain" src={sealUrl} />
              </div>
            ) : null}
          </div>
        </article>
      </section>

      {registerEntry?.status && registerEntry.status !== "ACTIVE" ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 print:hidden">
          This card is currently marked as {registerEntry.status.toLowerCase()}. Reactivate it from the ID card register before printing again.
        </section>
      ) : null}

      <IdCardPrintActions studentId={student.id} printCount={registerEntry?.printCount || 0} status={registerEntry?.status || "ACTIVE"} />
    </div>
  );
}
