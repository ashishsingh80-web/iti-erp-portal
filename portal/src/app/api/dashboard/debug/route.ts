import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getDashboardDiagnostics } from "@/lib/services/dashboard-service";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "dashboard", "view");

    const url = new URL(request.url);
    const sessionParam = url.searchParams.get("session");
    const selectedSession =
      sessionParam && sessionParam.trim() && sessionParam !== "ALL_ACTIVE" ? sessionParam.trim() : null;

    const diagnostics = await getDashboardDiagnostics(selectedSession);
    return NextResponse.json({ ok: true, diagnostics });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load dashboard diagnostics"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
