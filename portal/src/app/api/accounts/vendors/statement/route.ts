import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getVendorStatement } from "@/lib/services/vendor-service";

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "accounts", "view");
    const { searchParams } = new URL(request.url);
    const vendorName = searchParams.get("vendorName") || "";
    const format = searchParams.get("format") || "json";
    const report = await getVendorStatement(vendorName, {
      dateFrom: searchParams.get("dateFrom") || "",
      dateTo: searchParams.get("dateTo") || ""
    });

    if (format === "csv") {
      const lines = [
        "Vendor,Total Billed,Total Paid,Total Due",
        [report.vendorName, report.summary.totalBilled, report.summary.totalPaid, report.summary.totalDue].map(escapeCsv).join(","),
        ""
      ];

      report.bills.forEach((bill) => {
        lines.push(
          ["Bill Date", "Reference", "Material", "Bill Amount", "Paid", "Due", "Status"].join(","),
          [bill.billDate.slice(0, 10), bill.referenceNo, bill.materialDescription, bill.totalAmount, bill.paidAmount, bill.dueAmount, bill.paymentStatus].map(escapeCsv).join(",")
        );
        if (bill.payments.length) {
          lines.push("Payment Date,Voucher,Amount,Mode,Reference,Note,Added By");
          bill.payments.forEach((payment) => {
            lines.push(
              [payment.paymentDate.slice(0, 10), payment.voucherNo, payment.amountPaid, payment.paymentMode, payment.referenceNo, payment.note, payment.createdByName].map(escapeCsv).join(",")
            );
          });
        }
        lines.push("");
      });

      return new NextResponse(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="vendor-statement-${report.vendorName.replace(/\s+/g, "-").toLowerCase()}.csv"`
        }
      });
    }

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load vendor statement" },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
