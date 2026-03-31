import { NextResponse } from "next/server";
import { assertUserActionAccess, canUserPerformAction } from "@/lib/access";
import { toApiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { updatePrnScvtModule } from "@/lib/services/profile-operations-service";
import { prnScvtPatchSchema } from "@/lib/validations/profile-operations";

export async function PATCH(request: Request, context: { params: Promise<{ studentId: string }> }) {
  try {
    const user = await requireUser();
    const { studentId } = await context.params;
    const payload = prnScvtPatchSchema.parse(await request.json());
    const requiresPrnEdit = Boolean(payload?.prnNumber);
    const allowed = requiresPrnEdit
      ? canUserPerformAction(user, "prn", "edit")
      : canUserPerformAction(user, "scvt", "edit");

    if (!allowed) {
      assertUserActionAccess(user, requiresPrnEdit ? "prn" : "scvt", "edit");
    }
    const result = await updatePrnScvtModule(studentId, payload, user.id);

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to update PRN / SCVT module");
  }
}
