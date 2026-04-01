import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { applyOcrImport, previewOcrImport, type OcrImportKind } from "@/lib/services/ocr-import-service";

function isImportKind(value: string): value is OcrImportKind {
  return value === "SCHOLARSHIP" || value === "PRN" || value === "SCVT";
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const formData = await request.formData();
    const mode = String(formData.get("mode") || "preview").toLowerCase();
    const kind = String(formData.get("kind") || "").toUpperCase();
    const session = String(formData.get("session") || "").trim();
    const yearLabel = String(formData.get("yearLabel") || "").trim();

    if (!isImportKind(kind)) {
      return NextResponse.json({ ok: false, message: "Valid import kind is required" }, { status: 400 });
    }

    const moduleKey = kind === "SCHOLARSHIP" ? "scholarship" : kind === "SCVT" ? "scvt" : "prn";
    assertUserActionAccess(user, moduleKey, mode === "apply" ? "edit" : "view");

    if (mode === "apply") {
      const file = formData.get("file");
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ ok: false, message: "PDF file is required for apply" }, { status: 400 });
      }
      const preview = await previewOcrImport({
        file,
        kind,
        session: session || undefined,
        yearLabel: yearLabel || undefined
      });
      const result = await applyOcrImport({
        currentUserId: user.id,
        preview
      });

      return NextResponse.json({
        ok: true,
        ...result
      });
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ ok: false, message: "PDF file is required" }, { status: 400 });
    }

    const preview = await previewOcrImport({
      file,
      kind,
      session: session || undefined,
      yearLabel: yearLabel || undefined
    });

    return NextResponse.json({
      ok: true,
      preview
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to process OCR import" },
      { status: 400 }
    );
  }
}
