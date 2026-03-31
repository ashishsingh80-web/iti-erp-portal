import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getUnitAvailability } from "@/lib/services/admission-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "admissions", "view");

    const tradeId = request.nextUrl.searchParams.get("tradeId") || "";
    const session = request.nextUrl.searchParams.get("session") || "";
    const yearLabel = request.nextUrl.searchParams.get("yearLabel") || "";

    if (!tradeId || !session || !yearLabel) {
      return NextResponse.json({
        ok: true,
        units: []
      });
    }

    const units = await getUnitAvailability(tradeId, session, yearLabel);

    return NextResponse.json({
      ok: true,
      units
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load unit availability"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
