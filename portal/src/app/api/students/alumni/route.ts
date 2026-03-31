import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { listAlumniCandidates, sendStudentToAlumni } from "@/lib/services/student-lifecycle-service";

export async function GET() {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "alumni", "view");
    return NextResponse.json({ rows: await listAlumniCandidates() });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Failed to load alumni list" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "alumni", "edit");
    const body = (await request.json()) as { studentId?: string };
    if (!body.studentId) {
      return NextResponse.json({ ok: false, message: "Student is required" }, { status: 400 });
    }
    const student = await sendStudentToAlumni(body.studentId, user.id);
    return NextResponse.json({ ok: true, student });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Failed to move student to alumni" }, { status: 500 });
  }
}
