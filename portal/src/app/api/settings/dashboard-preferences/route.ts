import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { DASHBOARD_WIDGETS, type DashboardWidgetId, readDashboardPreferences, saveDashboardPreferences } from "@/lib/dashboard-preferences";

export async function GET() {
  try {
    const user = await requireUser();
    if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ ok: false, message: "Access denied for dashboard preferences" }, { status: 403 });
    }

    const config = await readDashboardPreferences();
    return NextResponse.json({ ok: true, config, widgets: DASHBOARD_WIDGETS });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load dashboard preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ ok: false, message: "Access denied for dashboard preferences" }, { status: 403 });
    }

    const payload = (await request.json()) as { visibleWidgets?: DashboardWidgetId[] };
    const config = await saveDashboardPreferences(payload.visibleWidgets || []);
    return NextResponse.json({ ok: true, config, widgets: DASHBOARD_WIDGETS });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to save dashboard preferences" },
      { status: 400 }
    );
  }
}
