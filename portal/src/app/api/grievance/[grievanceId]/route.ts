import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { updateGrievanceCase } from "@/lib/services/grievance-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ grievanceId: string }> }
) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "grievance", "edit");
    const { grievanceId } = await params;
    const body = (await request.json()) as {
      status?: string;
      priority?: string;
      assignedToName?: string;
      actionTaken?: string;
      resolutionNote?: string;
    };

    const grievance = await updateGrievanceCase(
      grievanceId,
      {
        status: body.status || "",
        priority: body.priority || "",
        assignedToName: body.assignedToName || "",
        actionTaken: body.actionTaken || "",
        resolutionNote: body.resolutionNote || ""
      },
      user.id
    );

    return NextResponse.json({ ok: true, grievance });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to update grievance case" }, { status: 400 });
  }
}
