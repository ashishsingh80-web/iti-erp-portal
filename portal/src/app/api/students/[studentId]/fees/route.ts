import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { toApiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { updateFeeModule } from "@/lib/services/profile-operations-service";
import { feePatchSchema } from "@/lib/validations/profile-operations";

export async function PATCH(request: Request, context: { params: Promise<{ studentId: string }> }) {
  try {
    const user = await requireUser();
    const payload = feePatchSchema.parse(await request.json());
    const touchesApprovalFields =
      payload?.action !== "ADD_PAYMENT" &&
      (payload?.practicalExamEligible !== undefined || payload?.adminOverride !== undefined || payload?.finalStatus !== undefined);
    assertUserActionAccess(user, "fees", payload?.action === "ADD_PAYMENT" ? "add" : touchesApprovalFields ? "approve" : "edit");
    const { studentId } = await context.params;
    const result = await updateFeeModule(studentId, payload, user.id);

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to update fee module");
  }
}
