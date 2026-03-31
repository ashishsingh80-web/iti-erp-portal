import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUserActionAccess } from "@/lib/access";
import { toApiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { formatDateOnly, updateEnquiry } from "@/lib/services/enquiry-service";
import { enquiryPayloadSchema, enquiryStatusValues } from "@/lib/validations/enquiry";

const updateSchema = enquiryPayloadSchema
  .pick({
    status: true,
    nextFollowUpDate: true,
    lastContactDate: true,
    assignedCounsellor: true,
    followUpNotes: true,
    lostReason: true,
    budgetConcern: true,
    notes: true
  })
  .partial()
  .superRefine((value, ctx) => {
    if (value.status === "LOST" && !value.lostReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lostReason"],
        message: "Lost reason is required when enquiry is marked as lost"
      });
    }
    if (value.status && !enquiryStatusValues.includes(value.status)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "Invalid enquiry status"
      });
    }
  });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ enquiryId: string }> }
) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "enquiry", "edit");

    const { enquiryId } = await params;
    const payload = updateSchema.parse(await request.json());
    const enquiry = await updateEnquiry(enquiryId, payload);

    return NextResponse.json({
      ok: true,
      enquiry: {
        id: enquiry.id,
        status: enquiry.status,
        nextFollowUpDate: formatDateOnly(enquiry.nextFollowUpDate),
        lastContactDate: formatDateOnly(enquiry.lastContactDate),
        assignedCounsellor: enquiry.assignedCounsellor,
        followUpNotes: enquiry.followUpNotes,
        lostReason: enquiry.lostReason,
        budgetConcern: enquiry.budgetConcern,
        notes: enquiry.notes
      }
    });
  } catch (error) {
    return toApiErrorResponse(error, "Unable to update enquiry");
  }
}
