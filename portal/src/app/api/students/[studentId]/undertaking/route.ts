import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { toApiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { reviewUndertaking, updateUndertakingModule, uploadSignedUndertaking } from "@/lib/services/profile-operations-service";
import { undertakingPatchSchema } from "@/lib/validations/profile-operations";

export async function PATCH(request: Request, context: { params: Promise<{ studentId: string }> }) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "undertaking", "edit");
    const { studentId } = await context.params;
    const payload = undertakingPatchSchema.parse(await request.json());

    if (payload?.action === "REVIEW_SIGNED_UPLOAD") {
      if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
        return NextResponse.json({ ok: false, message: "Only admin can review signed undertakings" }, { status: 403 });
      }

      const result = await reviewUndertaking(studentId, payload.status, user.id);

      return NextResponse.json({
        ok: true,
        ...result
      });
    }

    const result = await updateUndertakingModule(studentId, payload, user.id);

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to update undertaking module");
  }
}

export async function POST(request: Request, context: { params: Promise<{ studentId: string }> }) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "undertaking", "edit");
    const { studentId } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: "A signed undertaking file is required" }, { status: 400 });
    }

    // Upload hardening: signed undertaking documents are expected to be PDFs/images.
    const MAX_SIGNED_UNDERTAKING_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    const allowedExtRe = /\.(pdf|png|jpe?g)$/i;
    const allowedMimes = new Set(["application/pdf", "image/png", "image/jpeg"]);

    if (file.size > MAX_SIGNED_UNDERTAKING_FILE_SIZE_BYTES) {
      return NextResponse.json({ ok: false, message: "Signed undertaking file is too large" }, { status: 400 });
    }

    const fileName = file.name || "";
    if (!allowedExtRe.test(fileName)) {
      return NextResponse.json({ ok: false, message: "Invalid signed undertaking file type" }, { status: 400 });
    }

    if (file.type && !allowedMimes.has(file.type)) {
      return NextResponse.json({ ok: false, message: "Invalid signed undertaking file MIME type" }, { status: 400 });
    }

    const result = await uploadSignedUndertaking(studentId, file, user.id);

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to upload signed undertaking");
  }
}
