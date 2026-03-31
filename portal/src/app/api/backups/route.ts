import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { createSystemBackup, listBackupFiles, restoreSystemBackup } from "@/lib/services/backup-service";

export async function GET() {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "backup", "view");
    return NextResponse.json({ ok: true, ...(await listBackupFiles()) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load backups" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { mode?: string; fileName?: string };

    if (body.mode === "restore") {
      assertUserActionAccess(user, "backup", "edit");
      const result = await restoreSystemBackup(String(body.fileName || ""), user.id);
      return NextResponse.json({ ok: true, result });
    }

    assertUserActionAccess(user, "backup", "add");
    const result = await createSystemBackup(user.id);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to process backup action" },
      { status: 400 }
    );
  }
}
