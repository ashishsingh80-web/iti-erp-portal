import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { createGrievanceCase, listGrievanceDeskData } from "@/lib/services/grievance-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "grievance", "view");
    const searchParams = new URL(request.url).searchParams;
    return NextResponse.json({
      ok: true,
      ...(await listGrievanceDeskData(searchParams.get("search") || "", searchParams.get("status") || ""))
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to load grievance desk" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "grievance", "add");
    const body = (await request.json()) as {
      targetType?: string;
      studentId?: string;
      staffId?: string;
      category?: string;
      title?: string;
      description?: string;
      priority?: string;
      reportedByName?: string;
      reportedByMobile?: string;
      assignedToName?: string;
    };

    const grievance = await createGrievanceCase(
      {
        targetType: body.targetType || "GENERAL",
        studentId: body.studentId || "",
        staffId: body.staffId || "",
        category: body.category || "",
        title: body.title || "",
        description: body.description || "",
        priority: body.priority || "MEDIUM",
        reportedByName: body.reportedByName || "",
        reportedByMobile: body.reportedByMobile || "",
        assignedToName: body.assignedToName || ""
      },
      user.id
    );

    return NextResponse.json({ ok: true, grievance });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to create grievance case" }, { status: 400 });
  }
}
