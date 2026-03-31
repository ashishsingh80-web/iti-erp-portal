import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { deleteAccountEntry, updateAccountEntry } from "@/lib/services/accounts-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "accounts", "edit");
    const payload = await request.json();
    const { entryId } = await params;
    await updateAccountEntry(entryId, payload, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to update account entry"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ entryId: string }> }) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "accounts", "delete");
    const { entryId } = await params;
    await deleteAccountEntry(entryId, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to delete account entry"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
