import { AttendancePersonType, AttendanceStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { findAttendanceTargetByCode, listAttendanceRows, upsertAttendanceRecord } from "@/lib/services/attendance-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "attendance", "view");

    const scope = request.nextUrl.searchParams.get("scope") === "staff" ? "staff" : "students";
    const date = request.nextUrl.searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const search = request.nextUrl.searchParams.get("search") || "";
    return NextResponse.json({
      ok: true,
      rows: await listAttendanceRows(scope, date, search)
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to load attendance" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "attendance", "add");
    const body = (await request.json()) as {
      scope?: "students" | "staff";
      targetId?: string;
      code?: string;
      recordDate?: string;
      status?: AttendanceStatus;
      action?: "CHECK_IN" | "CHECK_OUT" | "STATUS_ONLY";
      note?: string;
    };

    const scope = body.scope === "staff" ? "staff" : "students";
    const target =
      body.targetId
        ? { id: body.targetId }
        : body.code
          ? await findAttendanceTargetByCode(body.code, scope)
          : null;

    if (!target?.id) {
      return NextResponse.json({ ok: false, message: "Attendance target not found" }, { status: 404 });
    }

    const record = await upsertAttendanceRecord({
      personType: scope === "staff" ? AttendancePersonType.STAFF : AttendancePersonType.STUDENT,
      targetId: target.id,
      recordDate: body.recordDate || new Date().toISOString().slice(0, 10),
      status: body.status || AttendanceStatus.PRESENT,
      action: body.action || "CHECK_IN",
      note: body.note || "",
      userId: user.id
    });

    return NextResponse.json({ ok: true, record });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to save attendance" }, { status: 400 });
  }
}
