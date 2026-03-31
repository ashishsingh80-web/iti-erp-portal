import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getMonthlyFinanceSummary } from "@/lib/services/accounts-service";

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
    const month = searchParams.get("month") || "";
    const format = searchParams.get("format") || "json";
    const report = await getMonthlyFinanceSummary(month);

    if (format === "csv") {
      const lines = [
        "Section,Label,Value",
        `Summary,Month,${escapeCsv(report.month)}`,
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
          "Content-Disposition": `attachment; filename="monthly-finance-${report.month}.csv"`
        }
      });
    }

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load monthly finance summary"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
