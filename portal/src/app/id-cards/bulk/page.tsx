import { notFound } from "next/navigation";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getInstituteBrandingByCode } from "@/lib/institute-branding-config";
import { prisma } from "@/lib/prisma";
import { buildQrImageUrl } from "@/lib/qr";

function formatDate(value?: Date | null) {
  return value ? value.toLocaleDateString("en-IN") : "Not Provided";
}

export default async function BulkStudentIdCardsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  assertUserActionAccess(user, "id-cards", "view");
  const query = await searchParams;

  const instituteCode = typeof query.instituteCode === "string" ? query.instituteCode : "";
  const tradeValue = typeof query.tradeValue === "string" ? query.tradeValue : "";
  const session = typeof query.session === "string" ? query.session : "";
  const yearLabel = typeof query.yearLabel === "string" ? query.yearLabel : "";

  const [tradeInstituteCode, tradeCode] = tradeValue.includes("::") ? tradeValue.split("::") : ["", ""];
  const effectiveInstituteCode = instituteCode || tradeInstituteCode;

  const students = await prisma.student.findMany({
    where: {
      deletedAt: null,
      ...(session ? { session } : {}),
      ...(yearLabel ? { yearLabel } : {}),
      ...(effectiveInstituteCode ? { institute: { instituteCode: effectiveInstituteCode } } : {}),
      ...(tradeCode
        ? {
            trade: {
              tradeCode,
              ...(tradeInstituteCode ? { institute: { instituteCode: tradeInstituteCode } } : {})
            }
          }
        : {})
    },
    include: {
      institute: true,
      trade: true,
      parents: true,
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: [{ institute: { instituteCode: "asc" } }, { trade: { name: "asc" } }, { fullName: "asc" }]
  });

  if (!students.length) notFound();

  const branding = effectiveInstituteCode ? await getInstituteBrandingByCode(effectiveInstituteCode) : null;
  const logoUrl = branding?.logoUrl || "/portal-logo.png";
  const sealUrl = branding?.sealUrl || "";
  const signatureUrl = branding?.signatureUrl || "";

  return (
    <div className="mx-auto max-w-7xl bg-stone-50 p-6 print:bg-white print:p-0">
      <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm print:rounded-none print:border-none print:shadow-none">
        <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Bulk Student ID Cards</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">
          {branding?.campusName || students[0]?.institute.name || "Student Identity Register"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Showing {students.length} students
          {session ? ` • Session ${session}` : ""}
          {yearLabel ? ` • ${yearLabel} Year` : ""}
          {tradeCode ? ` • Trade ${students[0]?.trade.name || tradeCode}` : ""}
        </p>
        <div className="mt-4 flex gap-3 print:hidden">
          <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white" onClick={() => window.print()} type="button">
            Print All Cards
          </button>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 print:gap-4">
        {students.map((student) => {
          const photoUrl = student.documents.find((item) => item.documentType === "STUDENT_PHOTO")?.fileUrl || null;
          const parent = student.parents[0] || null;
          const qrImageUrl = buildQrImageUrl(student.studentCode, 120);
          return (
            <article key={student.id} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm print:break-inside-avoid">
              <div className="bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-700 p-5 text-white">
                <div className="flex items-start gap-4">
                  <img alt="Institute logo" className="h-16 w-16 rounded-2xl bg-white/10 object-contain p-2" src={logoUrl} />
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-white/70">Student Identity Card</p>
                    <h2 className="mt-2 font-serif text-xl font-semibold tracking-tight">{student.institute.name}</h2>
                    <p className="mt-1 text-sm text-white/80">{branding?.campusName || student.institute.address || "Campus detail not set"}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-28 w-24 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
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
                      <p className="mt-1 text-lg font-semibold text-slate-900">{student.fullName}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Student Code</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{student.studentCode}</p>
                    </div>
                    <p className="text-sm text-slate-700">{student.trade.name} • {student.session} • {student.yearLabel}</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Father / Guardian</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{parent?.name || "Not Provided"}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Mobile</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{student.mobile}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Date of Birth</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(student.dateOfBirth)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Unit</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{student.unitNumber || "Not Set"}</p>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div className="text-xs text-slate-500">
                    <p>{branding?.contactPhone || "Institute contact not set"}</p>
                    <p>{branding?.contactEmail || "Institute email not set"}</p>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Attendance QR</p>
                      <img alt={`QR for ${student.studentCode}`} className="mt-2 h-16 w-16 rounded-2xl border border-slate-200 bg-white p-1 object-contain" src={qrImageUrl} />
                    </div>
                    {signatureUrl ? <img alt="Authorized signature" className="ml-auto h-12 w-auto object-contain" src={signatureUrl} /> : null}
                    <div className="text-right">
                      <p className="mt-2 border-t border-slate-300 pt-2 text-xs text-slate-600">{branding?.signatureLabel || "Authorized Signatory"}</p>
                    </div>
                  </div>
                </div>

                {sealUrl ? <img alt="Institute seal" className="ml-auto h-16 w-16 object-contain" src={sealUrl} /> : null}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
