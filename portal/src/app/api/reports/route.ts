import { NextResponse } from "next/server";
import { assertUserActionAccess, canUserPerformAction } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import {
  buildCsvReport,
  getReportData,
  getReportSummaries,
  paginateReportRows,
  reportKeys,
  sortReportRows,
  type ReportKey
} from "@/lib/services/report-service";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "reports", "view");
    const { searchParams } = new URL(request.url);
    const report = searchParams.get("report");
    const format = searchParams.get("format") || "json";
    const filters = {
      search: searchParams.get("search") || "",
      instituteCode: searchParams.get("instituteCode") || "",
      session: searchParams.get("session") || "",
      yearLabel: searchParams.get("yearLabel") || "",
      tradeValue: searchParams.get("tradeValue") || "",
      admissionMode: searchParams.get("admissionMode") || "",
      paymentMode: searchParams.get("paymentMode") || "",
      studentStatus: searchParams.get("studentStatus") || "",
      documentStatus: searchParams.get("documentStatus") || "",
      paymentStatus: searchParams.get("paymentStatus") || "",
      scholarshipStatus: searchParams.get("scholarshipStatus") || "",
      enquiryStatus: searchParams.get("enquiryStatus") || "",
      dateFrom: searchParams.get("dateFrom") || "",
      dateTo: searchParams.get("dateTo") || "",
      sortBy: searchParams.get("sortBy") || "",
      sortDir: searchParams.get("sortDir") || "asc",
      page: searchParams.get("page") || "1",
      pageSize: searchParams.get("pageSize") || "10"
    };

    if (format === "csv") {
      const canDownload = canUserPerformAction(user, "reports", "download");
      const canExport = canUserPerformAction(user, "reports", "export");
      if (!canDownload && !canExport) {
        return NextResponse.json(
          { ok: false, message: "Access denied for report export. Download or export permission is required." },
          { status: 403 }
        );
      }
    }

    if (!report) {
      const summaries = await getReportSummaries(filters);
      return NextResponse.json({
        ok: true,
        availableReports: reportKeys,
        summaries
      });
    }

    if (!reportKeys.includes(report as ReportKey)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Unknown report requested"
        },
        { status: 400 }
      );
    }

    const definition = await getReportData(report as ReportKey, filters);
    const sortedRows = filters.sortBy ? sortReportRows(definition.rows, filters.sortBy, filters.sortDir) : definition.rows;
    const exportScope = searchParams.get("exportScope") || "full";
    const exportRows =
      format === "csv" && exportScope === "current"
        ? paginateReportRows(sortedRows, Math.max(Number(filters.page || "1"), 1), Math.max(Number(filters.pageSize || "10"), 1))
        : sortedRows;
    const finalDefinition = {
      ...definition,
      rows: format === "csv" ? exportRows : sortedRows
    };

    if (format === "csv") {
      const csv = buildCsvReport(finalDefinition);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${finalDefinition.key}.csv"`
        }
      });
    }

    return NextResponse.json({
      ok: true,
      report: finalDefinition
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load reports"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
