import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { listStudents, listStudentsPage } from "@/lib/services/student-service";

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

function sortStudentRows(rows: Awaited<ReturnType<typeof listStudents>>, sortBy: string, sortDir: string) {
  const direction = sortDir === "desc" ? -1 : 1;
  const nextRows = [...rows];
  nextRows.sort((left, right) => {
    const leftValue = String((left as Record<string, string>)[sortBy] || "");
    const rightValue = String((right as Record<string, string>)[sortBy] || "");

    if (sortBy === "dueAmount") {
      return (Number(leftValue || 0) - Number(rightValue || 0)) * direction;
    }

    return leftValue.localeCompare(rightValue) * direction;
  });
  return nextRows;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "students", "view");
    const filters = {
      ids: (request.nextUrl.searchParams.get("ids") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      search: request.nextUrl.searchParams.get("search") || "",
      agentCode: request.nextUrl.searchParams.get("agentCode") || "",
      instituteCode: request.nextUrl.searchParams.get("instituteCode") || "",
      tradeName: request.nextUrl.searchParams.get("tradeName") || "",
      session: request.nextUrl.searchParams.get("session") || "",
      yearLabel: request.nextUrl.searchParams.get("yearLabel") || "",
      status: request.nextUrl.searchParams.get("status") || "",
      lifecycleStage: request.nextUrl.searchParams.get("lifecycleStage") || "",
      archiveCategory: request.nextUrl.searchParams.get("archiveCategory") || "",
      documentsStatus: request.nextUrl.searchParams.get("documentsStatus") || "",
      eligibilityStatus: request.nextUrl.searchParams.get("eligibilityStatus") || "",
      paymentStatus: request.nextUrl.searchParams.get("paymentStatus") || "",
      scholarshipStatus: request.nextUrl.searchParams.get("scholarshipStatus") || "",
      missingPrn: request.nextUrl.searchParams.get("missingPrn") === "1",
      missingScvt: request.nextUrl.searchParams.get("missingScvt") === "1",
      scvtVerificationStatus: request.nextUrl.searchParams.get("scvtVerificationStatus") || "",
      undertakingSignedStatus: request.nextUrl.searchParams.get("undertakingSignedStatus") || "",
      undertakingGenerationStatus: request.nextUrl.searchParams.get("undertakingGenerationStatus") || ""
    };
    const sortBy = request.nextUrl.searchParams.get("sortBy") || "fullName";
    const sortDir = request.nextUrl.searchParams.get("sortDir") || "asc";
    const page = Math.max(Number(request.nextUrl.searchParams.get("page") || "1"), 1);
    const pageSize = Math.max(Number(request.nextUrl.searchParams.get("pageSize") || "25"), 1);
    const format = request.nextUrl.searchParams.get("format") || "json";
    const exportScope = request.nextUrl.searchParams.get("exportScope") || "full";

    const pageResult = await listStudentsPage(filters, { page, pageSize, sortBy, sortDir });
    const rows = pageResult.rows;

    if (format === "csv") {
      const exportRows = exportScope === "current" ? rows : sortStudentRows(await listStudents(filters), sortBy, sortDir);
      const headers = ["Student Code", "Name", "Institute", "Trade", "Session", "Year", "Status", "Lifecycle", "Documents", "Eligibility", "Due"];
      const body = exportRows.map((row) =>
        [
          row.studentCode,
          row.fullName,
          row.instituteName,
          row.tradeName,
          row.session,
          row.yearLabel,
          row.status,
          row.lifecycleStage || "",
          row.documentsStatus,
          row.eligibilityStatus,
          row.dueAmount
        ].map((item) => escapeCsv(String(item || ""))).join(",")
      );

      return new NextResponse([headers.join(","), ...body].join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="students.csv"'
        }
      });
    }

    return NextResponse.json({
      filters,
      total: pageResult.total,
      page,
      pageSize,
      rows
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("Access denied")
        ? error.message
        : "Student directory is temporarily unavailable. Please refresh after restart.";

    return NextResponse.json(
      {
        ok: false,
        message
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
