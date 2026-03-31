import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { issueInventoryItem } from "@/lib/services/inventory-service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "inventory", "add");
    const body = (await request.json()) as {
      itemId?: string;
      studentId?: string;
      quantityIssued?: string;
      issueDate?: string;
      expectedReturnDate?: string;
      remark?: string;
    };

    const issue = await issueInventoryItem(
      {
        itemId: body.itemId || "",
        studentId: body.studentId || "",
        quantityIssued: body.quantityIssued || "",
        issueDate: body.issueDate || "",
        expectedReturnDate: body.expectedReturnDate || "",
        remark: body.remark || ""
      },
      user.id
    );

    return NextResponse.json({ ok: true, issue });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to issue item" }, { status: 400 });
  }
}
