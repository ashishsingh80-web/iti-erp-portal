import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { createVendorBill, listVendorBills } from "@/lib/services/vendor-service";

export async function GET() {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "accounts", "view");
    const data = await listVendorBills();
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load vendor bills"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "accounts", "add");
    const payload = await request.json();
    const vendorBillId = await createVendorBill(payload, user.id);
    return NextResponse.json({ ok: true, vendorBillId });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to create vendor bill"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
