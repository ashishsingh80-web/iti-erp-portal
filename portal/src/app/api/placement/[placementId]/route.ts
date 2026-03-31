import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { updatePlacementRecord } from "@/lib/services/placement-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ placementId: string }> }
) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "placement", "edit");
    const { placementId } = await params;
    const body = (await request.json()) as {
      companyId?: string;
      employerName?: string;
      designation?: string;
      locationName?: string;
      salaryOffered?: string;
      placementStatus?: string;
      apprenticeshipStatus?: string;
      offerDate?: string;
      joiningDate?: string;
      completionDate?: string;
      note?: string;
    };

    const placement = await updatePlacementRecord(
      placementId,
      {
        companyId: body.companyId || "",
        employerName: body.employerName || "",
        designation: body.designation || "",
        locationName: body.locationName || "",
        salaryOffered: body.salaryOffered || "",
        placementStatus: body.placementStatus || "",
        apprenticeshipStatus: body.apprenticeshipStatus || "",
        offerDate: body.offerDate || "",
        joiningDate: body.joiningDate || "",
        completionDate: body.completionDate || "",
        note: body.note || ""
      },
      user.id
    );

    return NextResponse.json({ ok: true, placement });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to update placement record" }, { status: 400 });
  }
}
