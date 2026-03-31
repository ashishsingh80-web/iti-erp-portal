import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { readUndertakingTemplate, saveUndertakingTemplate } from "@/lib/undertaking-template";

export async function GET() {
  try {
    const user = await requireUser();

    if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ ok: false, message: "Access denied for undertaking template" }, { status: 403 });
    }

    const template = await readUndertakingTemplate();

    return NextResponse.json({
      ok: true,
      template
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load undertaking template"
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();

    if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ ok: false, message: "Access denied for undertaking template" }, { status: 403 });
    }

    const payload = (await request.json()) as { template?: string };
    const template = await saveUndertakingTemplate(String(payload.template || ""));

    return NextResponse.json({
      ok: true,
      template
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to save undertaking template"
      },
      { status: 400 }
    );
  }
}
