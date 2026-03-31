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
    const report = await getPeriodicFinanceSummary({
      period: searchParams.get("period") || "MONTHLY",
      reportDate: searchParams.get("reportDate") || "",
      weekDate: searchParams.get("weekDate") || "",
      month: searchParams.get("month") || "",
      dateFrom: searchParams.get("dateFrom") || "",
      dateTo: searchParams.get("dateTo") || ""
    });

    if (format === "csv") {
      const lines = [
        "Section,Label,Value",
        `Summary,Period,${escapeCsv(report.period)}`,
        `Summary,Range,${escapeCsv(report.label)}`,
        `Summary,Total Income,${escapeCsv(report.summary.totalIncome)}`,
        `Summary,Total Expense,${escapeCsv(report.summary.totalExpense)}`,
        `Summary,Total Bank Deposit,${escapeCsv(report.summary.totalBankDeposit)}`,
        `Summary,Net Balance,${escapeCsv(report.summary.netBalance)}`,
        "",
        "Head,Entries,Total",
        ...report.headSummary.map((item: { head: string; entries: string; total: string }) => [item.head, item.entries, item.total].map(escapeCsv).join(",")),
        "",
        "Party,Entries,Income,Expense,Net Balance,Latest",
        ...report.partyLedgerRows.map((item) =>
          [item.partyName, item.entries, item.totalIncome, item.totalExpense, item.netBalance, item.latestDate.slice(0, 10)].map(escapeCsv).join(",")
        )
      ];

      return new NextResponse(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="finance-report-${report.period.toLowerCase()}.csv"`
        }
      });
    }

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load finance report"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
