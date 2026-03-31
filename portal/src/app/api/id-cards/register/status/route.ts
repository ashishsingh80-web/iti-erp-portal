import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { updateIdCardStatus } from "@/lib/id-card-register";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "id-cards", "view");

    const payload = (await request.json()) as {
      entityType?: "student" | "staff";
      entityId?: string;
      status?: "ACTIVE" | "CANCELLED" | "REPLACED";
      statusNote?: string;
    };

    if (!payload.entityType || !payload.entityId || !payload.status) {
      return NextResponse.json({ ok: false, message: "Entity type, entity id, and status are required." }, { status: 400 });
    }

    const entry = await updateIdCardStatus({
      entityType: payload.entityType,
      entityId: payload.entityId,
      status: payload.status,
      statusNote: payload.statusNote,
      updatedBy: user.name || user.email
    });

    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to update ID card status." },
      { status: 400 }
    );
  }
}
