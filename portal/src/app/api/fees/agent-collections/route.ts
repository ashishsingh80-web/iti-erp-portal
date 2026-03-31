import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { createAgentCollection, getAgentOutstandingLedger, listAgentCollections } from "@/lib/services/agent-ledger-service";

export async function GET() {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "fees", "view");
    const rows = await listAgentCollections();
    const agentOutstandingRows = await getAgentOutstandingLedger();

    return NextResponse.json({
      ok: true,
      rows,
      agentOutstandingRows
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load agent collections"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "fees", "add");
    const payload = await request.json();
    const collectionId = await createAgentCollection(payload, user.id);

    return NextResponse.json({
      ok: true,
      collectionId
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to create agent collection"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
