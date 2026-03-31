import { StudentArchiveCategory } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { archiveStudentCase, listArchiveCases } from "@/lib/services/student-lifecycle-service";

export async function GET() {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "student-archive", "view");
    return NextResponse.json({ rows: await listArchiveCases() });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Failed to load archive cases" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "student-archive", "edit");
    const body = (await request.json()) as { studentId?: string; category?: StudentArchiveCategory; note?: string };
    if (!body.studentId || !body.category) {
      return NextResponse.json({ ok: false, message: "Student and archive category are required" }, { status: 400 });
    }
    const student = await archiveStudentCase(body.studentId, body.category, body.note || "", user.id);
    return NextResponse.json({ ok: true, student });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Failed to archive student case" }, { status: 500 });
  }
}
