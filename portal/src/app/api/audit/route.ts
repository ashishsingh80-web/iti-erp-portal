import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { listAuditLogs } from "@/lib/services/audit-service";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "settings", "view");
    const { searchParams } = new URL(request.url);
    const module = searchParams.get("module") || "";
    const studentId = searchParams.get("studentId") || "";
    const rows = await listAuditLogs({
      module: module || undefined,
      studentId: studentId || undefined,
      limit: 100
    });

    return NextResponse.json({
      ok: true,
      rows
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load audit logs"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
