import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { uploadStudentDocument } from "@/lib/services/document-service";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "documents", "add");
    const formData = await request.formData();

    const studentId = String(formData.get("studentId") || "");
    const documentType = String(formData.get("documentType") || "OTHER");
    const ownerType = String(formData.get("ownerType") || "STUDENT");
    const remarks = String(formData.get("remarks") || "");
    const file = formData.get("file");

    if (!studentId) {
      return NextResponse.json({ ok: false, message: "studentId is required" }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: "A file is required" }, { status: 400 });
    }

    // Upload hardening: limit size and restrict file types to prevent DoS and risky content.
    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    const allowedExtRe = /\.(pdf|png|jpe?g)$/i;
    const allowedMimes = new Set(["application/pdf", "image/png", "image/jpeg"]);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ ok: false, message: "File is too large" }, { status: 400 });
    }
    const fileName = file.name || "";
    if (!allowedExtRe.test(fileName)) {
      return NextResponse.json({ ok: false, message: "Invalid file type" }, { status: 400 });
    }
    if (file.type && !allowedMimes.has(file.type)) {
      return NextResponse.json({ ok: false, message: "Invalid file MIME type" }, { status: 400 });
    }

    const document = await uploadStudentDocument({
      studentId,
      documentType,
      ownerType,
      remarks,
      file
    });

    return NextResponse.json({
      ok: true,
      document
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Upload failed"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
