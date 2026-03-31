import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { returnInventoryIssue } from "@/lib/services/inventory-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "inventory", "edit");
    const { issueId } = await params;
    const body = (await request.json()) as {
      quantityReturned?: string;
      returnDate?: string;
      remark?: string;
    };

    const issue = await returnInventoryIssue(
      {
        issueId,
        quantityReturned: body.quantityReturned || "",
        returnDate: body.returnDate || "",
        remark: body.remark || ""
      },
      user.id
    );

    return NextResponse.json({ ok: true, issue });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to return item" }, { status: 400 });
  }
}
