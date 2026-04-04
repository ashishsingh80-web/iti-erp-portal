import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { listWorkbenchStudentsPage, type WorkbenchQueue } from "@/lib/services/student-workbench-service";

const QUEUES = new Set<WorkbenchQueue>(["all", "pending_any", "docs", "upload", "form", "eligibility"]);

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "students", "view");

    const q = request.nextUrl.searchParams;
    const queueRaw = (q.get("queue") || "pending_any").trim();
    const queue = (QUEUES.has(queueRaw as WorkbenchQueue) ? queueRaw : "pending_any") as WorkbenchQueue;
    const session = (q.get("session") || "").trim();
    const search = (q.get("search") || "").trim();
    const page = Math.max(1, Number(q.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(5, Number(q.get("pageSize") || "40")));

    const { rows, total } = await listWorkbenchStudentsPage({
      queue,
      session: session || undefined,
      search: search || undefined,
      page,
      pageSize
    });

    return NextResponse.json({
      ok: true,
      rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load workbench"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
