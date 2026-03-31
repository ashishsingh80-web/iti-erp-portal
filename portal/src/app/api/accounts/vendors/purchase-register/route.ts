import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getPurchaseRegister } from "@/lib/services/vendor-service";

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
    const format = searchParams.get("format") || "json";
    const report = await getPurchaseRegister({
      vendorName: searchParams.get("vendorName") || "",
      dateFrom: searchParams.get("dateFrom") || "",
      dateTo: searchParams.get("dateTo") || ""
    });

    if (format === "csv") {
      const lines = [
        "Summary,Value",
        `Total Billed,${escapeCsv(report.summary.totalBilled)}`,
        `Total Paid,${escapeCsv(report.summary.totalPaid)}`,
        `Total Due,${escapeCsv(report.summary.totalDue)}`,
        "",
        "Vendor,Bill Date,Material,Reference,Total,Paid,Due,Status,Added By",
        ...report.rows.map((item) =>
          [
            item.vendorName,
            item.billDate.slice(0, 10),
            item.materialDescription,
            item.referenceNo,
            item.totalAmount,
            item.paidAmount,
            item.dueAmount,
            item.paymentStatus,
            item.createdByName
          ].map(escapeCsv).join(",")
        )
      ];

      return new NextResponse(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="purchase-register.csv"'
        }
      });
    }

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load purchase register" },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
