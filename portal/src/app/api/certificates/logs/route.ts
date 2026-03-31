import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { listRecentCertificateLogs } from "@/lib/services/certificate-service";

export async function GET() {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "certificates", "view");
    return NextResponse.json({ ok: true, rows: await listRecentCertificateLogs() });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to load certificate logs" }, { status: 500 });
  }
}
