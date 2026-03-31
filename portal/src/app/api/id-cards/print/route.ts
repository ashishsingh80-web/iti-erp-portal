import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getIdCardRegisterEntry, logIdCardPrint } from "@/lib/id-card-register";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "id-cards", "view");

    const payload = (await request.json()) as {
      entityType?: "student" | "staff";
      entityId?: string;
      reason?: string;
    };

    if (!payload.entityType || !payload.entityId) {
      return NextResponse.json({ ok: false, message: "Entity type and entity id are required." }, { status: 400 });
    }

    if (payload.entityType === "student") {
      const student = await prisma.student.findUnique({
        where: { id: payload.entityId },
        select: { id: true, studentCode: true, fullName: true }
      });
      if (!student) {
        return NextResponse.json({ ok: false, message: "Student not found." }, { status: 404 });
      }
      const existingEntry = await getIdCardRegisterEntry("student", student.id);
      if (existingEntry && existingEntry.status !== "ACTIVE") {
        return NextResponse.json(
          {
            ok: false,
            message: `This ID card is ${existingEntry.status.toLowerCase()}. Reactivate it from the ID card register before printing again.`
          },
          { status: 400 }
        );
      }
      const entry = await logIdCardPrint({
        entityType: "student",
        entityId: student.id,
        code: student.studentCode,
        fullName: student.fullName,
        reason: payload.reason?.trim() || "Initial Issue",
        printedBy: user.name || user.email
      });
      return NextResponse.json({ ok: true, entry });
    }

    const staff = await prisma.hrStaff.findUnique({
      where: { id: payload.entityId },
      select: { id: true, employeeCode: true, fullName: true }
    });
    if (!staff) {
      return NextResponse.json({ ok: false, message: "Staff not found." }, { status: 404 });
    }
    const existingEntry = await getIdCardRegisterEntry("staff", staff.id);
    if (existingEntry && existingEntry.status !== "ACTIVE") {
      return NextResponse.json(
        {
          ok: false,
          message: `This ID card is ${existingEntry.status.toLowerCase()}. Reactivate it from the ID card register before printing again.`
        },
        { status: 400 }
      );
    }
    const entry = await logIdCardPrint({
      entityType: "staff",
      entityId: staff.id,
      code: staff.employeeCode,
      fullName: staff.fullName,
      reason: payload.reason?.trim() || "Initial Issue",
      printedBy: user.name || user.email
    });
    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to log ID card print." },
      { status: 400 }
    );
  }
}
