import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { restoreStudent, softDeleteStudent } from "@/lib/services/recycle-bin-service";

export async function DELETE(_: Request, context: { params: Promise<{ studentId: string }> }) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "students", "delete");
    const { studentId } = await context.params;
    const result = await softDeleteStudent(studentId, user.id);

    return NextResponse.json({
      ok: true,
      result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to delete student"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ studentId: string }> }) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "students", "edit");
    const { studentId } = await context.params;
    const payload = (await request.json()) as { action?: string };

    if (payload.action !== "restore") {
      return NextResponse.json({ ok: false, message: "Invalid action" }, { status: 400 });
    }

    const result = await restoreStudent(studentId, user.id);

    return NextResponse.json({
      ok: true,
      result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to restore student"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
