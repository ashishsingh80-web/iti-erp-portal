import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getMergedAddressMasterData } from "@/lib/address-master-store";

export async function GET() {
  try {
    await requireUser();
    const data = await getMergedAddressMasterData();

    return NextResponse.json({
      ok: true,
      data
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load address masters"
      },
      { status: 500 }
    );
  }
}
