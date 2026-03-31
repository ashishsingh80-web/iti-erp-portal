import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { addVendorPayment } from "@/lib/services/vendor-service";

export async function POST(request: Request, { params }: { params: Promise<{ billId: string }> }) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "accounts", "edit");
    const payload = await request.json();
    const { billId } = await params;
    const paymentId = await addVendorPayment(billId, payload, user.id);
    return NextResponse.json({ ok: true, paymentId });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to add vendor payment"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
