import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getPartyLedgerDetails } from "@/lib/services/accounts-service";

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
    const partyName = searchParams.get("partyName") || "";
    const month = searchParams.get("month") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const format = searchParams.get("format") || "json";

    const report = await getPartyLedgerDetails(partyName, {
      month,
      dateFrom,
      dateTo
    });

    if (format === "csv") {
      const lines = [
        "Party,Incoming,Outgoing,Net Balance",
        [report.partyName, report.summary.incoming, report.summary.outgoing, report.summary.netBalance].map(escapeCsv).join(","),
        "",
        "Date,Voucher,Type,Head,Sub Head,Amount,Payment Mode,Reference,Note,Added By",
        ...report.rows.map((item) =>
          [
            item.entryDate.slice(0, 10),
            item.voucherNo,
            item.entryType,
            item.head || item.category,
            item.subHead || "",
            item.amount,
            item.paymentMode,
            item.referenceNo || "",
            item.note || "",
            item.createdByName
          ].map(escapeCsv).join(",")
        )
      ];

      return new NextResponse(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="party-ledger-${report.partyName.replace(/\s+/g, "-").toLowerCase()}.csv"`
        }
      });
    }

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load party ledger"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
