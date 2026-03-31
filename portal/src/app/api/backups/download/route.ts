import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getBackupDownload } from "@/lib/services/backup-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "backup", "view");
    const fileName = new URL(request.url).searchParams.get("file") || "";
    const safeHeaderFileName = fileName.replace(/[\r\n"]/g, "_");
    const { buffer } = await getBackupDownload(fileName);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeHeaderFileName}"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to download backup" },
      { status: 400 }
    );
  }
}
