import { NextRequest, NextResponse } from "next/server";
import { requireParentUser } from "@/lib/parent-auth";
import { createGrievanceCase } from "@/lib/services/grievance-service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireParentUser();
    const body = (await request.json()) as {
      category?: string;
      title?: string;
      description?: string;
      priority?: string;
    };

    const grievance = await createGrievanceCase({
      targetType: "STUDENT",
      studentId: user.studentId,
      category: body.category || "Portal Support",
      title: body.title || "",
      description: body.description || "",
      priority: body.priority || "MEDIUM",
      reportedByName: `${user.parentName} (${user.relation})`,
      reportedByMobile: ""
    });

    return NextResponse.json({ ok: true, grievanceNo: grievance.grievanceNo });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to create support request" },
      { status: 400 }
    );
  }
}
