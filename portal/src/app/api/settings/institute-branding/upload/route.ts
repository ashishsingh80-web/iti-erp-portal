import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { saveInstituteBrandingFile } from "@/lib/services/institute-branding-upload-service";

function assertAdmin(role: string) {
  if (!["SUPER_ADMIN", "ADMIN"].includes(role)) {
    throw new Error("Access denied for institute branding upload");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertAdmin(user.role);

    const formData = await request.formData();
    const instituteCode = String(formData.get("instituteCode") || "").trim().toUpperCase();
    const assetType = String(formData.get("assetType") || "").trim() as "logo" | "seal" | "signature";
    const file = formData.get("file");

    if (!instituteCode) {
      return NextResponse.json({ ok: false, message: "Institute code is required" }, { status: 400 });
    }

    if (!["logo", "seal", "signature"].includes(assetType)) {
      return NextResponse.json({ ok: false, message: "Invalid branding asset type" }, { status: 400 });
    }

    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ ok: false, message: "Branding file is required" }, { status: 400 });
    }

    // Upload hardening: restrict file types + size.
    const MAX_BRANDING_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
    const allowedExtRe = /\.(png|jpe?g)$/i;
    const allowedMimes = new Set(["image/png", "image/jpeg"]);

    if (file.size > MAX_BRANDING_FILE_SIZE_BYTES) {
      return NextResponse.json({ ok: false, message: "Branding file is too large" }, { status: 400 });
    }

    const fileName = file.name || "";
    if (!allowedExtRe.test(fileName)) {
      return NextResponse.json({ ok: false, message: "Invalid branding file type" }, { status: 400 });
    }

    if (file.type && !allowedMimes.has(file.type)) {
      return NextResponse.json({ ok: false, message: "Invalid branding file MIME type" }, { status: 400 });
    }

    const uploaded = await saveInstituteBrandingFile(instituteCode, file, assetType);

    return NextResponse.json({
      ok: true,
      assetType,
      fileUrl: uploaded.fileUrl,
      originalName: uploaded.originalName
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to upload branding asset" },
      { status: 400 }
    );
  }
}
