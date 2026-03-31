import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { toApiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { updateScholarshipModule } from "@/lib/services/profile-operations-service";
import { scholarshipPatchSchema } from "@/lib/validations/profile-operations";

export async function PATCH(request: Request, context: { params: Promise<{ studentId: string }> }) {
  try {
    const user = await requireUser();
    const payload = scholarshipPatchSchema.parse(await request.json());
    const touchesApprovalFields =
      typeof payload?.approvedDate === "string" ||
      payload?.creditedAmount !== undefined ||
      typeof payload?.creditDate === "string" ||
      ["APPROVED", "CREDITED", "REJECTED"].includes(String(payload?.status || ""));
    assertUserActionAccess(user, "scholarship", touchesApprovalFields ? "approve" : "edit");
    const { studentId } = await context.params;
    const result = await updateScholarshipModule(studentId, payload, user.id);

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to update scholarship module");
  }
}
