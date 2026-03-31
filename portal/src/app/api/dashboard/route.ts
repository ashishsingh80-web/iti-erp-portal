import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/services/dashboard-service";

export async function GET() {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "dashboard", "view");
    const cards = await getDashboardMetrics();

    return NextResponse.json({
      cards
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load dashboard"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
