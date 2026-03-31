import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getDayClosingSummary } from "@/lib/services/accounts-service";

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
    const date = searchParams.get("date");
    const format = searchParams.get("format") || "json";

    if (!date) {
      return NextResponse.json(
        {
          ok: false,
          message: "Date is required"
        },
        { status: 400 }
      );
    }

    const report = await getDayClosingSummary(date);

    if (format === "csv") {
      const lines = [
        ["Date", report.date].map(escapeCsv).join(","),
        ["Today's Opening Balance", report.summary.todayOpeningBalance].map(escapeCsv).join(","),
        ["Today's Cash Receipts", report.summary.todayCashReceipts].map(escapeCsv).join(","),
        ["Today's Cash Expenses", report.summary.todayCashExpenses].map(escapeCsv).join(","),
        ["Today's Bank Deposits", report.summary.todayBankDeposits].map(escapeCsv).join(","),
        ["Today's Closing Balance", report.summary.todayClosingBalance].map(escapeCsv).join(","),
        "",
        ["Cashbook Voucher", "Type", "Head", "Party", "Amount"].map(escapeCsv).join(","),
        ...report.cashbookRows.map((row) =>
          [row.voucherNo, row.entryType, row.head || "", row.partyName || "", row.amount].map(escapeCsv).join(",")
        ),
        "",
        ["Bankbook Voucher", "Type", "Mode", "Party", "Amount"].map(escapeCsv).join(","),
        ...report.bankbookRows.map((row) =>
          [row.voucherNo, row.entryType, row.paymentMode, row.partyName || "", row.amount].map(escapeCsv).join(",")
        )
      ];

      return new NextResponse(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="closing-summary-${report.date}.csv"`
        }
      });
    }

    return NextResponse.json({
      ok: true,
      report
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to export closing summary"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
