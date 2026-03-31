import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { listAuditLogs } from "@/lib/services/audit-service";

export async function GET() {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "timetable", "view");
    const rows = await listAuditLogs({ module: "timetable", limit: 50 });
    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load timetable history" },
      { status: 400 }
    );
  }
}
