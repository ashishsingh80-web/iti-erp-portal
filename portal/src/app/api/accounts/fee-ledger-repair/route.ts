import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { repairFeeLedgerConsistency } from "@/lib/services/accounts-service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "accounts", "edit");

    const body = (await request.json().catch(() => ({}))) as { dryRun?: boolean };
    const result = await repairFeeLedgerConsistency(user.id, {
      dryRun: body.dryRun !== false
    });
    return NextResponse.json({
      ok: true,
      result: {
        ...result,
        runBy: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to reconcile fee ledger"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
