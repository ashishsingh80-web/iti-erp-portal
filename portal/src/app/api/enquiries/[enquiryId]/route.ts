import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUserActionAccess } from "@/lib/access";
import { toApiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { formatDateOnly, updateEnquiry } from "@/lib/services/enquiry-service";
import { enquiryStatusValues } from "@/lib/validations/enquiry";

const optionalText = z.string().trim().optional().or(z.literal(""));
const optionalDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Date must be in YYYY-MM-DD format");

const updateSchema = z
  .object({
    status: z.enum(enquiryStatusValues).optional(),
    nextFollowUpDate: optionalDate,
    lastContactDate: optionalDate,
    assignedCounsellor: optionalText,
    followUpNotes: optionalText,
    lostReason: optionalText,
    budgetConcern: optionalText,
    notes: optionalText
  })
  .superRefine((value, ctx) => {
    if (value.status === "LOST" && !value.lostReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lostReason"],
        message: "Lost reason is required when enquiry is marked as lost"
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
