import { CertificateType } from "@prisma/client";
import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { issueCertificate } from "@/lib/services/certificate-service";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "certificates", "add");
    const body = (await request.json()) as {
      studentId?: string;
      certificateType?: CertificateType;
      note?: string;
    };

    if (!body.studentId || !body.certificateType) {
      return NextResponse.json({ ok: false, message: "Student and certificate type are required" }, { status: 400 });
    }

    const result = await issueCertificate(body.studentId, body.certificateType, user.id, body.note || "");
    return NextResponse.json({
      ok: true,
      ...result,
      printUrl: `/certificates/${result.logId}`
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to issue certificate" }, { status: 400 });
  }
}
