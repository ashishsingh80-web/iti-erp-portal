import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { listNoDuesRows, saveNoDuesClearances } from "@/lib/services/no-dues-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "no-dues", "view");
    const search = new URL(request.url).searchParams.get("search") || "";
    return NextResponse.json({ ok: true, rows: await listNoDuesRows(search) });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to load no dues data" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "no-dues", "edit");
    const body = (await request.json()) as {
      studentId?: string;
      clearances?: Array<{ department: string; isCleared: boolean; clearanceDate?: string; remark?: string }>;
    };

    if (!body.studentId || !Array.isArray(body.clearances) || !body.clearances.length) {
      return NextResponse.json({ ok: false, message: "Student and department clearances are required" }, { status: 400 });
    }

    const student = await saveNoDuesClearances(body.studentId, body.clearances, user.id);
    return NextResponse.json({ ok: true, student });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to save no dues data" }, { status: 500 });
  }
}
