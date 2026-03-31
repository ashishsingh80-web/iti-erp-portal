import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getStudentProfile } from "@/lib/services/student-service";

export async function GET(_: Request, context: { params: Promise<{ studentId: string }> }) {
  const user = await requireUser();
  assertUserActionAccess(user, "students", "view");
  const { studentId } = await context.params;
  const profile = await getStudentProfile(studentId);

  if (!profile) {
    return NextResponse.json(
      {
        ok: false,
        message: "Student not found"
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    profile
  });
}
