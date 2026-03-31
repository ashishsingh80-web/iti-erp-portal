import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { toApiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { createAdmission } from "@/lib/services/admission-service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "admissions", "add");

    const contentType = request.headers.get("content-type") || "";
    let payload: unknown;
    let files = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      payload = JSON.parse(String(formData.get("payload") || "{}"));
      const qualificationDocuments = Array.from(formData.entries())
        .filter(([key, value]) => key.startsWith("qualificationDocument_") && value instanceof File)
        .map(([key, value]) => ({
          index: Number(key.replace("qualificationDocument_", "")),
          file: value as File
        }))
        .filter((item) => Number.isInteger(item.index) && item.index >= 0);

      files = {
        studentPhoto: formData.get("studentPhoto") instanceof File ? (formData.get("studentPhoto") as File) : null,
        qualificationDocuments,
        casteCertificate: formData.get("casteCertificate") instanceof File ? (formData.get("casteCertificate") as File) : null,
        incomeCertificate: formData.get("incomeCertificate") instanceof File ? (formData.get("incomeCertificate") as File) : null
      };
    } else {
      payload = await request.json();
    }

    const result = await createAdmission(payload, user.id, files);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to create admission");
  }
}
