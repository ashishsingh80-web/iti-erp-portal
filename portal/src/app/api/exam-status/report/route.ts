import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { buildExamStatusCsv } from "@/lib/services/exam-service";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "exam-status", "view");
    const { searchParams } = new URL(request.url);
    const rawKind = searchParams.get("kind");
    const kind =
      rawKind === "results" || rawKind === "overrides" || rawKind === "hall-ticket"
        ? rawKind
        : "eligibility";
    const search = searchParams.get("search") || "";
    const csv = await buildExamStatusCsv(kind, search);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="exam-${kind}.csv"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to export exam report" },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
