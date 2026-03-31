import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { listPromotionCandidates, promoteStudentToSecondYear } from "@/lib/services/student-lifecycle-service";

export async function GET() {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "promote", "view");
    return NextResponse.json({ rows: await listPromotionCandidates() });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Failed to load promotion list" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "promote", "edit");
    const body = (await request.json()) as { studentId?: string };
    if (!body.studentId) {
      return NextResponse.json({ ok: false, message: "Student is required" }, { status: 400 });
    }
    const student = await promoteStudentToSecondYear(body.studentId, user.id);
    return NextResponse.json({ ok: true, student });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Failed to promote student" }, { status: 500 });
  }
}
