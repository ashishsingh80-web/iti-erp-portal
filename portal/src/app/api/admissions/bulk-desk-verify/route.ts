import { StudentStatus, VerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_BATCH = 100;

/**
 * Office desk verification for bulk-imported rows: marks admission form, eligibility, and
 * documents as verified and completes admission (undertaking stays as-is).
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "admissions", "add");

    const body = (await request.json()) as { studentIds?: string[] };
    const ids = Array.isArray(body.studentIds)
      ? body.studentIds
          .filter((id) => typeof id === "string" && id.trim())
          .map((id) => id.trim())
      : [];

    if (!ids.length) {
      return NextResponse.json({ ok: false, message: "No students selected" }, { status: 400 });
    }

    if (ids.length > MAX_BATCH) {
      return NextResponse.json(
        { ok: false, message: `Select at most ${MAX_BATCH} students per request` },
        { status: 400 }
      );
    }

    const result = await prisma.student.updateMany({
      where: {
        id: { in: ids },
        deletedAt: null
      },
      data: {
        documentsStatus: VerificationStatus.VERIFIED,
        admissionFormStatus: VerificationStatus.VERIFIED,
        eligibilityStatus: VerificationStatus.VERIFIED,
        status: StudentStatus.COMPLETED,
        admissionStatusLabel: "ADMITTED",
        completionDate: new Date()
      }
    });

    return NextResponse.json({
      ok: true,
      updatedCount: result.count
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to update students"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
