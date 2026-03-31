import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { allocateAgentCollectionBalance } from "@/lib/services/agent-ledger-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ collectionId: string }> }) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "fees", "edit");
    const payload = await request.json();
    const { collectionId } = await params;
    await allocateAgentCollectionBalance(collectionId, payload, user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to allocate agent balance"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
