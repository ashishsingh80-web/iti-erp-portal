import { notFound } from "next/navigation";
import { ReplacementReceiptActions } from "@/components/id-cards/replacement-receipt-actions";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getIdCardRegisterEntry } from "@/lib/id-card-register";
import { getInstituteBrandingByCode } from "@/lib/institute-branding-config";
import { prisma } from "@/lib/prisma";

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function amountToWords(amount: number) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function belowThousand(value: number) {
    let output = "";
    if (value >= 100) {
      output += `${ones[Math.floor(value / 100)]} Hundred `;
      value %= 100;
    }
    if (value >= 20) {
      output += `${tens[Math.floor(value / 10)]} `;
      value %= 10;
    } else if (value >= 10) {
      output += `${teens[value - 10]} `;
      value = 0;
    }
    if (value > 0) output += `${ones[value]} `;
    return output.trim();
  }

  if (!amount) return "Zero Rupees Only";

  const parts: string[] = [];
  const crore = Math.floor(amount / 10000000);
  const lakh = Math.floor((amount % 10000000) / 100000);
  const thousand = Math.floor((amount % 100000) / 1000);
  const hundred = amount % 1000;

  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${belowThousand(thousand)} Thousand`);
  if (hundred) parts.push(belowThousand(hundred));

  return `${parts.join(" ").trim()} Rupees Only`;
}

export default async function IdCardReplacementReceiptPage({
  params
}: {
  params: Promise<{ entityType: string; entityId: string }>;
}) {
  const user = await requireUser();
  assertUserActionAccess(user, "id-cards", "view");

  const { entityType, entityId } = await params;
  if (entityType !== "student" && entityType !== "staff") notFound();

  const registerEntry = await getIdCardRegisterEntry(entityType, entityId);
  if (!registerEntry?.replacementReceiptNumber || !registerEntry.replacementFeePostedAt) {
    notFound();
  }

  let instituteName = "Institute ERP";
  let campusName = "Campus detail not set";
  let instituteCode = "";
  let logoUrl = "/portal-logo.png";
  let signatureUrl = "";
  let signatureLabel = "Authorized Signature";
  let receiptHeaderText = "ID Card Replacement Fee Receipt";
  let backHref = "/modules/id-cards";

  if (entityType === "student") {
    const student = await prisma.student.findUnique({
      where: { id: entityId },
      include: { institute: true, trade: true }
    });
    if (!student) notFound();
    const branding = await getInstituteBrandingByCode(student.institute.instituteCode);
    instituteName = student.institute.name;
    campusName = branding?.campusName || student.institute.address || campusName;
    instituteCode = student.institute.instituteCode;
    logoUrl = branding?.logoUrl || logoUrl;
    signatureUrl = branding?.signatureUrl || "";
    signatureLabel = branding?.signatureLabel || signatureLabel;
    receiptHeaderText = branding?.receiptHeaderText || receiptHeaderText;
    backHref = `/students/${student.id}`;
  } else {
    const branding = await getInstituteBrandingByCode("ITI01");
    logoUrl = branding?.logoUrl || logoUrl;
    campusName = branding?.campusName || campusName;
    signatureUrl = branding?.signatureUrl || "";
    signatureLabel = branding?.signatureLabel || signatureLabel;
    receiptHeaderText = branding?.receiptHeaderText || receiptHeaderText;
    backHref = "/modules/hr";
  }

  const amount = Number(registerEntry.replacementFee || 0);

  return (
    <div className="mx-auto max-w-3xl bg-stone-50 p-6 print:bg-white print:p-0">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-start gap-4">
            <img alt="Institute logo" className="h-20 w-20 object-contain" src={logoUrl} />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">ID Card Receipt</p>
              <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-slate-900">{instituteName}</h1>
              <p className="mt-1 text-sm text-slate-600">{campusName}</p>
              <p className="mt-2 text-sm font-medium text-slate-700">{receiptHeaderText}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Receipt No</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{registerEntry.replacementReceiptNumber}</p>
            <p className="mt-2 text-sm text-slate-600">{new Date(registerEntry.replacementFeePostedAt).toLocaleDateString("en-IN")}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{entityType === "student" ? "Student" : "Staff"}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{registerEntry.fullName}</p>
            <p className="mt-1 text-sm text-slate-600">{registerEntry.code}</p>
            <p className="mt-1 text-sm text-slate-600">Card No: {registerEntry.cardNumber}</p>
            <p className="mt-1 text-sm text-slate-600">Issue Version: V{registerEntry.issueVersion}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Payment</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(amount)}</p>
            <p className="mt-1 text-sm text-slate-600">Mode: {registerEntry.replacementPaymentMode || "CASH"}</p>
            <p className="mt-1 text-sm text-slate-600">Reference: {registerEntry.replacementReferenceNo || "-"}</p>
            <p className="mt-1 text-sm text-slate-600">Posted By: {registerEntry.replacementFeePostedBy || "-"}</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-emerald-50 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Received Against</p>
          <p className="mt-2 text-sm text-emerald-900">ID card replacement / reissue request for {registerEntry.fullName}</p>
          <p className="mt-2 text-sm text-emerald-900">Reason: {registerEntry.replacementReason || "Replacement requested"}</p>
          <p className="mt-2 text-sm text-emerald-900">Institute Code: {instituteCode || "-"}</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Amount In Words</p>
            <p className="mt-2 text-base font-medium text-slate-900">{amountToWords(Math.round(amount))}</p>
            <p className="mt-4 text-sm text-slate-600">Received with thanks against the institute ID card replacement register.</p>
          </div>
          <div className="rounded-3xl border border-dashed border-slate-300 bg-stone-50 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Office Use</p>
            {signatureUrl ? <img alt="Authorized signature" className="mt-6 h-16 w-auto object-contain" src={signatureUrl} /> : null}
            <div className="mt-12 border-t border-slate-300 pt-3 text-sm text-slate-600">{signatureLabel}</div>
          </div>
        </div>

        <ReplacementReceiptActions backHref={backHref} />
      </section>
    </div>
  );
}
