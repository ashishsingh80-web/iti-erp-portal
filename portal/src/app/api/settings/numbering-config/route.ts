import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { previewGeneratedCode, readNumberingConfig, saveNumberingConfig, type NumberingConfig, type NumberingKind } from "@/lib/numbering-config";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "settings", "view");

    const url = new URL(request.url);
    const previewKind = url.searchParams.get("previewKind") as NumberingKind | null;

    if (previewKind) {
      const code = await previewGeneratedCode(previewKind, {
        session: url.searchParams.get("session"),
        institute: url.searchParams.get("institute"),
        trade: url.searchParams.get("trade")
      });
      return NextResponse.json({ ok: true, code });
    }

    const config = await readNumberingConfig();
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to load numbering settings" }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "settings", "edit");
    const payload = (await request.json()) as Omit<NumberingConfig, "updatedAt">;
    const config = await saveNumberingConfig(payload);
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to save numbering settings" }, { status: 400 });
  }
}
