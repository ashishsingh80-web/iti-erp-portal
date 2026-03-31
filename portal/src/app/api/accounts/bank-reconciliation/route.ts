import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getPeriodicFinanceSummary } from "@/lib/services/accounts-service";

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
    const statementBalance = searchParams.get("statementBalance") || "";
    const report = await getPeriodicFinanceSummary({
      period: searchParams.get("period") || "MONTHLY",
      reportDate: searchParams.get("reportDate") || "",
      weekDate: searchParams.get("weekDate") || "",
      month: searchParams.get("month") || "",
      dateFrom: searchParams.get("dateFrom") || "",
      dateTo: searchParams.get("dateTo") || ""
    });

    const expected = Number(report.bankReconciliation.expectedBankbookBalance || 0);
    const statement = statementBalance ? Number(statementBalance) : null;
    const difference = statement !== null ? (statement - expected).toFixed(2) : "";

    if (format === "csv") {
      const lines = [
        "Range,Digital Receipts,Cash Deposits,Bank Expenses,Expected Bankbook Balance,Statement Balance,Difference",
        [
          report.label,
          report.bankReconciliation.digitalReceipts,
          report.bankReconciliation.cashDeposits,
          report.bankReconciliation.bankExpenses,
          report.bankReconciliation.expectedBankbookBalance,
          statementBalance,
          difference
        ].map(escapeCsv).join(",")
      ];

      return new NextResponse(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="bank-reconciliation-${report.period.toLowerCase()}.csv"`
        }
      });
    }

    return NextResponse.json({
      ok: true,
      label: report.label,
      bankReconciliation: report.bankReconciliation,
      statementBalance,
      difference
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load bank reconciliation" },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
