import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { toApiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { updateExamStatusModule } from "@/lib/services/profile-operations-service";
import { examStatusPatchSchema } from "@/lib/validations/profile-operations";

export async function PATCH(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const user = await requireUser();
    const payload = examStatusPatchSchema.parse(await request.json());
    const touchesApprovalFields =
      typeof payload?.hallTicketIssuedOn === "string" ||
      Boolean(payload?.resultPublished) ||
      typeof payload?.resultDeclaredOn === "string" ||
      typeof payload?.adminOverrideReason === "string";
    assertUserActionAccess(user, "exam-status", touchesApprovalFields ? "approve" : "edit");
    const { studentId } = await params;
    const result = await updateExamStatusModule(studentId, payload, user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to update exam status module");
  }
}
