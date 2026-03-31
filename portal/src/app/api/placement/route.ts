import { NextRequest, NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { createPlacementCompany, createPlacementRecord, listPlacementDeskData } from "@/lib/services/placement-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "placement", "view");
    const searchParams = new URL(request.url).searchParams;
    return NextResponse.json({
      ok: true,
      ...(await listPlacementDeskData(searchParams.get("search") || "", searchParams.get("status") || ""))
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to load placement desk" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "placement", "add");
    const body = (await request.json()) as { mode?: string; [key: string]: unknown };

    if (body.mode === "company") {
      const company = await createPlacementCompany(
        {
          companyName: String(body.companyName || ""),
          contactPerson: String(body.contactPerson || ""),
          mobile: String(body.mobile || ""),
          email: String(body.email || ""),
          addressLine: String(body.addressLine || ""),
          industryType: String(body.industryType || ""),
          note: String(body.note || "")
        },
        user.id
      );

      return NextResponse.json({ ok: true, company });
    }

    const placement = await createPlacementRecord(
      {
        studentId: String(body.studentId || ""),
        companyId: String(body.companyId || ""),
        employerName: String(body.employerName || ""),
        designation: String(body.designation || ""),
        locationName: String(body.locationName || ""),
        salaryOffered: String(body.salaryOffered || ""),
        placementStatus: String(body.placementStatus || "INTERESTED"),
        apprenticeshipStatus: String(body.apprenticeshipStatus || "NOT_STARTED"),
        offerDate: String(body.offerDate || ""),
        joiningDate: String(body.joiningDate || ""),
        completionDate: String(body.completionDate || ""),
        note: String(body.note || "")
      },
      user.id
    );

    return NextResponse.json({ ok: true, placement });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to save placement data" }, { status: 400 });
  }
}
