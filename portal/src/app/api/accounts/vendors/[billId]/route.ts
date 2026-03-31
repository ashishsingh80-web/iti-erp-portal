import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { deleteVendorBill, updateVendorBill } from "@/lib/services/vendor-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ billId: string }> }) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "accounts", "edit");
    const payload = await request.json();
    const { billId } = await params;
    const vendorBillId = await updateVendorBill(billId, payload, user.id);
    return NextResponse.json({ ok: true, vendorBillId });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to update vendor bill"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ billId: string }> }) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "accounts", "delete");
    const { billId } = await params;
    await deleteVendorBill(billId, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to delete vendor bill"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
