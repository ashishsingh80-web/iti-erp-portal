import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ enquiryId: string }> }
) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "admissions", "add");
    assertUserActionAccess(user, "enquiry", "edit");

    const { enquiryId } = await params;
    const enquiry = await prisma.enquiry.findUnique({
      where: { id: enquiryId }
    });

    if (!enquiry) {
      return NextResponse.json({ ok: false, message: "Enquiry not found" }, { status: 404 });
    }

    const query = new URLSearchParams();
    query.set("sourceEnquiryId", enquiry.id);
    query.set("fullName", enquiry.fullName);
    query.set("mobile", enquiry.mobile);
    if (enquiry.parentMobile) query.set("parentMobile", enquiry.parentMobile);
    if (enquiry.instituteCode) query.set("instituteId", enquiry.instituteCode);
    if (enquiry.tradeId) query.set("tradeId", enquiry.tradeId);
    if (enquiry.category) query.set("category", enquiry.category);
    if (enquiry.address) query.set("address", enquiry.address);
    if (enquiry.notes) query.set("notes", enquiry.notes);
    if (enquiry.qualification) query.set("qualification", enquiry.qualification);
    if (enquiry.admissionMode) query.set("admissionMode", enquiry.admissionMode);

    if (enquiry.status === "NEW" || enquiry.status === "FOLLOW_UP") {
      await prisma.enquiry.update({
        where: { id: enquiry.id },
        data: {
          status: "DOCUMENTS_PENDING",
          lastContactDate: new Date()
        }
      });
    }

    return NextResponse.json({
      ok: true,
      prefillUrl: `/modules/admissions?${query.toString()}`
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to open admission conversion"
      },
      { status: 400 }
    );
  }
}
