import { notFound } from "next/navigation";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { readInstituteBrandingConfig } from "@/lib/institute-branding-config";
import { prisma } from "@/lib/prisma";
import { buildQrImageUrl } from "@/lib/qr";

function formatDate(value?: Date | null) {
  return value ? value.toLocaleDateString("en-IN") : "Not Provided";
}

export default async function BulkStaffIdCardsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  assertUserActionAccess(user, "id-cards", "view");
  const query = await searchParams;

  const scope = typeof query.scope === "string" ? query.scope : "active";
  const department = typeof query.department === "string" ? query.department.trim() : "";

  const staff = await prisma.hrStaff.findMany({
    where: {
      ...(scope === "active" ? { isActive: true, isGovtRecordOnly: false } : {}),
      ...(scope === "all" ? {} : {}),
      ...(scope === "govt" ? { isGovtRecordOnly: true } : {}),
      ...(scope === "experience" ? { isExperienceCase: true } : {}),
      ...(department ? { department: { contains: department, mode: "insensitive" } } : {})
    },
    include: {
      qualifications: {
        orderBy: [{ passingYear: "desc" }, { createdAt: "desc" }]
      }
    },
    orderBy: [{ department: "asc" }, { designation: "asc" }, { fullName: "asc" }]
  });

  if (!staff.length) notFound();

  const brandingConfig = await readInstituteBrandingConfig();
  const primaryBranding = brandingConfig.institutes[0] || null;
  const logoUrl = primaryBranding?.logoUrl || "/portal-logo.png";
  const sealUrl = primaryBranding?.sealUrl || "";
  const signatureUrl = primaryBranding?.signatureUrl || "";

  return (
    <div className="mx-auto max-w-7xl bg-stone-50 p-6 print:bg-white print:p-0">
      <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm print:rounded-none print:border-none print:shadow-none">
        <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Bulk Staff ID Cards</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">{primaryBranding?.campusName || "Staff Identity Register"}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Showing {staff.length} staff records • Scope {scope.replaceAll("_", " ")}
          {department ? ` • Department ${department}` : ""}
        </p>
        <div className="mt-4 flex gap-3 print:hidden">
          <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white" onClick={() => window.print()} type="button">
            Print All Cards
          </button>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 print:gap-4">
        {staff.map((item) => {
          const mainQualification =
            item.qualifications[0]?.level?.replaceAll("_", " ") ||
            item.technicalQualification ||
            item.academicQualification ||
            "Not Provided";
          const qrImageUrl = buildQrImageUrl(item.employeeCode, 120);

          return (
            <article key={item.id} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm print:break-inside-avoid">
              <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-cyan-700 p-5 text-white">
                <div className="flex items-start gap-4">
                  <img alt="Institute logo" className="h-16 w-16 rounded-2xl bg-white/10 object-contain p-2" src={logoUrl} />
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-white/70">Staff Identity Card</p>
                    <h2 className="mt-2 font-serif text-xl font-semibold tracking-tight">{primaryBranding?.campusName || "Institute Operations Portal"}</h2>
                    <p className="mt-1 text-sm text-white/80">{primaryBranding?.contactPhone || "Institute contact not set"}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-28 w-24 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                    {item.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={item.fullName} className="h-full w-full object-cover" src={item.photoUrl} />
                    ) : (
                      <span className="text-4xl font-semibold text-slate-400">{item.fullName.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="grid flex-1 gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Staff Name</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{item.fullName}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Employee Code</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{item.employeeCode}</p>
                    </div>
                    <p className="text-sm text-slate-700">{item.designation || "Not Provided"} • {item.department || "Not Provided"}</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Mobile</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{item.mobile || "Not Provided"}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Date of Birth</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(item.dateOfBirth)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Joining Date</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(item.joiningDate)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Category</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{item.staffCategory.replaceAll("_", " ")}</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Qualification</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{mainQualification}</p>
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div className="text-xs text-slate-500">
                    <p>{primaryBranding?.contactEmail || "Institute email not set"}</p>
                    <p>{primaryBranding?.website || "Website not set"}</p>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Attendance QR</p>
                      <img alt={`QR for ${item.employeeCode}`} className="mt-2 h-16 w-16 rounded-2xl border border-slate-200 bg-white p-1 object-contain" src={qrImageUrl} />
                    </div>
                    {signatureUrl ? <img alt="Authorized signature" className="ml-auto h-12 w-auto object-contain" src={signatureUrl} /> : null}
                    <div className="text-right">
                      <p className="mt-2 border-t border-slate-300 pt-2 text-xs text-slate-600">{primaryBranding?.signatureLabel || "Authorized Signatory"}</p>
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
