import { notFound } from "next/navigation";
import { ReceiptActions } from "@/components/receipts/receipt-actions";
import { prisma } from "@/lib/prisma";
import { buildFeeReceiptNumber } from "@/lib/services/accounts-service";
import { getInstituteBrandingByCode } from "@/lib/institute-branding-config";

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
    if (value > 0) {
      output += `${ones[value]} `;
    }
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

export default async function ReceiptPage({ params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;

  const transaction = await prisma.feeTransaction.findUnique({
    where: { id: transactionId },
    include: {
      student: {
        include: {
          institute: true,
          trade: true
        }
      },
      agent: true
    }
  });

  if (!transaction) {
    notFound();
  }

  const receiptNo = transaction.receiptNumber || buildFeeReceiptNumber(transaction.id, transaction.transactionDate);
  const amountPaid = Number(transaction.amountPaid);
  const branding = await getInstituteBrandingByCode(transaction.student.institute.instituteCode);
  const logoUrl = branding?.logoUrl || "/portal-logo.png";
  const signatureUrl = branding?.signatureUrl || "";
  const signatureLabel = branding?.signatureLabel || "Authorized Signature";
  const receiptHeaderText = branding?.receiptHeaderText || "Student Fee Collection Receipt";

  return (
    <div className="receipt-page mx-auto max-w-3xl bg-stone-50 p-6 print:bg-white print:p-0">
      <section className="receipt-sheet rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-start gap-4">
            <img alt="Institute logo" className="h-20 w-20 object-contain" src={logoUrl} />
            <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Fee Receipt</p>
            <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-slate-900">{transaction.student.institute.name}</h1>
            <p className="mt-1 text-sm text-slate-600">{branding?.campusName || transaction.student.institute.address || "Campus detail not set"}</p>
            <p className="mt-2 text-sm font-medium text-slate-700">{transaction.student.institute.name}</p>
            <p className="mt-1 text-sm text-slate-600">{receiptHeaderText}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Receipt No</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{receiptNo}</p>
            <p className="mt-2 text-sm text-slate-600">{transaction.transactionDate.toLocaleDateString("en-IN")}</p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="w-1/2 bg-slate-50 px-4 py-3 font-semibold text-slate-700">Student Name</td>
                <td className="px-4 py-3 text-slate-900">{transaction.student.fullName}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="bg-slate-50 px-4 py-3 font-semibold text-slate-700">Student Code</td>
                <td className="px-4 py-3 text-slate-900">{transaction.student.studentCode}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="bg-slate-50 px-4 py-3 font-semibold text-slate-700">Trade / Session</td>
                <td className="px-4 py-3 text-slate-900">{transaction.student.trade.name} • {transaction.student.session} • {transaction.student.yearLabel}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="bg-slate-50 px-4 py-3 font-semibold text-slate-700">Amount Received</td>
                <td className="px-4 py-3 text-lg font-semibold text-slate-900">{formatCurrency(amountPaid)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="bg-slate-50 px-4 py-3 font-semibold text-slate-700">Payment Mode</td>
                <td className="px-4 py-3 text-slate-900">{transaction.paymentMode}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="bg-slate-50 px-4 py-3 font-semibold text-slate-700">Payer Type</td>
                <td className="px-4 py-3 text-slate-900">{transaction.payerType}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="bg-slate-50 px-4 py-3 font-semibold text-slate-700">Reference No.</td>
                <td className="px-4 py-3 text-slate-900">{transaction.referenceNo || "-"}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="bg-slate-50 px-4 py-3 font-semibold text-slate-700">Received Against</td>
                <td className="px-4 py-3 text-slate-900">
                  Admission / fee payment for {transaction.student.fullName}
                  {transaction.agent ? ` via agent ${transaction.agent.name}` : ""}
                </td>
              </tr>
              <tr>
                <td className="bg-slate-50 px-4 py-3 font-semibold text-slate-700">Remark</td>
                <td className="px-4 py-3 text-slate-900">{transaction.remark || "No remark"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Amount In Words</p>
            <p className="mt-2 text-base font-medium text-slate-900">{amountToWords(Math.round(amountPaid))}</p>
            <p className="mt-4 text-sm text-slate-600">Received with thanks against the student fee account maintained by the institute.</p>
          </div>
          <div className="rounded-3xl border border-dashed border-slate-300 bg-stone-50 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Authorized Sign</p>
            {signatureUrl ? <img alt="Authorized signature" className="mt-6 h-16 w-auto object-contain" src={signatureUrl} /> : null}
            <div className="mt-12 border-t border-slate-300 pt-3 text-sm text-slate-600">{signatureLabel}</div>
          </div>
        </div>

        <ReceiptActions studentId={transaction.studentId} />
      </section>
    </div>
  );
}
