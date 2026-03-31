import { NextRequest, NextResponse } from "next/server";
import { requireStudentUser } from "@/lib/student-auth";
import { createGrievanceCase } from "@/lib/services/grievance-service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireStudentUser();
    const body = (await request.json()) as {
      category?: string;
      title?: string;
      description?: string;
      priority?: string;
    };

    const grievance = await createGrievanceCase({
      targetType: "STUDENT",
      studentId: user.id,
      category: body.category || "Portal Support",
      title: body.title || "",
      description: body.description || "",
      priority: body.priority || "MEDIUM",
      reportedByName: user.fullName,
      reportedByMobile: user.mobile
    });

    return NextResponse.json({ ok: true, grievanceNo: grievance.grievanceNo });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to create support request" },
      { status: 400 }
    );
  }
}
