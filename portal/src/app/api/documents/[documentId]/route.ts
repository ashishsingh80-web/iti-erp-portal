import { VerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { deleteStudentDocument, updateDocumentVerification } from "@/lib/services/document-service";

export async function PATCH(request: Request, context: { params: Promise<{ documentId: string }> }) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "documents", "edit");
    const { documentId } = await context.params;
    const body = await request.json();
    const status = String(body.status || "");
    const remarks = String(body.remarks || "");

    if (!["VERIFIED", "REJECTED", "INCOMPLETE", "PENDING"].includes(status)) {
      return NextResponse.json({ ok: false, message: "Invalid status" }, { status: 400 });
    }

    const document = await updateDocumentVerification(documentId, status as VerificationStatus, remarks);

    return NextResponse.json({
      ok: true,
      document
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Verification update failed"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ documentId: string }> }) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "documents", "delete");
    const { documentId } = await context.params;
    const result = await deleteStudentDocument(documentId);

    return NextResponse.json({
      ok: true,
      result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Document delete failed"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
