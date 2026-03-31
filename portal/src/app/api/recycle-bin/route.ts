import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { listDeletedRecords, restoreDocument } from "@/lib/services/recycle-bin-service";

export async function GET() {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "settings", "view");
    const result = await listDeletedRecords();

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("Access denied")
        ? error.message
        : "Recycle bin is temporarily unavailable. Please refresh after restart.";

    return NextResponse.json(
      {
        ok: false,
        message
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "settings", "edit");
    const payload = (await request.json()) as { type?: string; id?: string };

    if (payload.type !== "document" || !payload.id) {
      return NextResponse.json({ ok: false, message: "Only document restore is supported here" }, { status: 400 });
    }

    const result = await restoreDocument(payload.id, user.id);

    return NextResponse.json({
      ok: true,
      result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to restore item"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
