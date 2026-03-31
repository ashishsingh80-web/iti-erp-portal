import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { createInventoryItem, listInventoryDeskData } from "@/lib/services/inventory-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "inventory", "view");
    const searchParams = new URL(request.url).searchParams;
    const data = await listInventoryDeskData(searchParams.get("search") || "", searchParams.get("department") || "");
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to load inventory" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "inventory", "add");
    const body = (await request.json()) as {
      itemCode?: string;
      itemName?: string;
      department?: string;
      unitLabel?: string;
      currentStock?: string;
      reorderLevel?: string;
      storageLocation?: string;
      note?: string;
      isActive?: boolean;
    };

    const item = await createInventoryItem(
      {
        itemCode: body.itemCode || "",
        itemName: body.itemName || "",
        department: body.department || "",
        unitLabel: body.unitLabel || "",
        currentStock: body.currentStock || "0",
        reorderLevel: body.reorderLevel || "0",
        storageLocation: body.storageLocation || "",
        note: body.note || "",
        isActive: body.isActive ?? true
      },
      user.id
    );

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to create inventory item" }, { status: 400 });
  }
}
