import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { assignAdmissionUnit, updateAdmissionLifecycle, type AdmissionLifecycleAction } from "@/lib/services/admission-lifecycle-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "admissions", "edit");
    const { studentId } = await params;
    const body = (await request.json()) as {
      action?: AdmissionLifecycleAction | "ASSIGN_UNIT";
      note?: string;
      unitNumber?: number;
    };

    if (body.action === "ASSIGN_UNIT") {
      const unitNumber = Number(body.unitNumber || 0);
      if (!unitNumber) {
        return NextResponse.json({ ok: false, message: "Valid unit number is required" }, { status: 400 });
      }

      const student = await assignAdmissionUnit(studentId, unitNumber, user.id);
      return NextResponse.json({
        ok: true,
        student: {
          id: student.id,
          studentCode: student.studentCode,
          unitNumber: student.unitNumber
        }
      });
    }

    if (!body.action || !["CANCELED", "DROPPED", "TRANSFERRED"].includes(body.action)) {
      return NextResponse.json({ ok: false, message: "Valid admission action is required" }, { status: 400 });
    }

    const student = await updateAdmissionLifecycle(studentId, body.action, body.note || "", user.id);
    return NextResponse.json({
      ok: true,
      student: {
        id: student.id,
        studentCode: student.studentCode,
        admissionStatusLabel: student.admissionStatusLabel,
        status: student.status,
        lifecycleStage: student.lifecycleStage
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to update admission status"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
