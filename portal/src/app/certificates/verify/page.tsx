import Link from "next/link";
import { getCertificateVerificationData } from "@/lib/services/certificate-service";

export default async function CertificateVerificationPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const code = typeof query.code === "string" ? query.code : "";
  const certificate = code ? await getCertificateVerificationData(code) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Certificate Verification</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-slate-900">Institute Certificate Verification Desk</h1>
        <p className="mt-3 text-sm text-slate-600">
          Verify a bonafide, character, no dues, or practical permission certificate using its printed verification code.
        </p>

        <form className="mt-6 flex flex-wrap gap-3" method="get">
          <input
            className="min-w-[280px] flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            defaultValue={code}
            name="code"
            placeholder="Enter verification code"
          />
          <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white" type="submit">
            Verify
          </button>
        </form>

        {code && !certificate ? (
          <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            No certificate was found for verification code <span className="font-semibold">{code}</span>.
          </div>
        ) : null}

        {certificate ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
              Certificate verified successfully.
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Certificate</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{certificate.certificateNumber}</p>
                <p className="mt-1 text-sm text-slate-600">{certificate.certificateType}</p>
                <p className="mt-1 text-sm text-slate-600">Issue Date: {new Date(certificate.issueDate).toLocaleDateString("en-IN")}</p>
                <p className="mt-1 text-sm text-slate-600">Print Count: {certificate.printCount}</p>
              </article>
              <article className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Student</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{certificate.studentName}</p>
                <p className="mt-1 text-sm text-slate-600">{certificate.studentCode}</p>
                <p className="mt-1 text-sm text-slate-600">{certificate.instituteName}</p>
                <p className="mt-1 text-sm text-slate-600">{certificate.tradeName}</p>
              </article>
            </div>
            <Link className="inline-flex rounded-2xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-800" href={`/certificates/${certificate.id}`}>
              Open Certificate
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
