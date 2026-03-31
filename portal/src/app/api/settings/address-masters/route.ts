import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getMergedAddressMasterData, readAddressMasterConfig, saveAddressMasterConfig } from "@/lib/address-master-store";
import type { StateMap } from "@/lib/address-masters";

export async function GET() {
  try {
    const user = await requireUser();
    if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ ok: false, message: "Access denied for address master settings" }, { status: 403 });
    }

    const saved = await readAddressMasterConfig();
    const merged = await getMergedAddressMasterData();

    return NextResponse.json({
      ok: true,
      config: saved,
      merged
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load address master settings"
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ ok: false, message: "Access denied for address master settings" }, { status: 403 });
    }

    const payload = (await request.json()) as {
      hierarchy?: StateMap;
    };

    const hierarchy = payload.hierarchy;
    if (!hierarchy || typeof hierarchy !== "object" || Array.isArray(hierarchy)) {
      return NextResponse.json({ ok: false, message: "A valid address hierarchy object is required" }, { status: 400 });
    }

    const config = await saveAddressMasterConfig(hierarchy);
    const merged = await getMergedAddressMasterData();

    return NextResponse.json({
      ok: true,
      config,
      merged
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to save address master settings"
      },
      { status: 400 }
    );
  }
}
