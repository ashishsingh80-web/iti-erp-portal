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
        "Range,Head,Entries,Total",
        ...report.headSummary.map((item: { head: string; entries: string; total: string }) =>
          [report.label, item.head, item.entries, item.total].map(escapeCsv).join(",")
        )
      ];

      return new NextResponse(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="head-summary-${report.period.toLowerCase()}.csv"`
        }
      });
    }

    return NextResponse.json({ ok: true, label: report.label, rows: report.headSummary });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load head summary" },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
