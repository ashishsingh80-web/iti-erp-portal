import { z } from "zod";

const optionalText = z.string().trim().optional().or(z.literal(""));
const optionalDate = z.string().trim().optional().or(z.literal(""));
const dateOnlySchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const enquiryStatusValues = [
  "NEW",
  "FOLLOW_UP",
  "VISIT_SCHEDULED",
  "COUNSELLED",
  "INTERESTED",
  "DOCUMENTS_PENDING",
  "CONVERTED",
  "LOST"
] as const;

export const enquirySourceValues = [
  "WALK_IN",
  "CALL",
  "AGENT",
  "REFERRAL",
  "CAMP",
  "SOCIAL_MEDIA",
  "OTHER"
] as const;

export const enquiryPayloadSchema = z.object({
  fullName: z.string().trim().min(2, "Student name is required"),
  mobile: z.string().trim().regex(/^\d{10}$/, "Mobile must be 10 digits"),
  parentMobile: optionalText.refine((value) => !value || /^\d{10}$/.test(value), "Parent mobile must be 10 digits"),
  instituteCode: optionalText,
  tradeId: optionalText,
  qualification: optionalText,
  category: optionalText,
  address: optionalText,
  source: z.enum(enquirySourceValues).default("WALK_IN"),
  enquiryDate: dateOnlySchema,
  status: z.enum(enquiryStatusValues).default("NEW"),
  nextFollowUpDate: optionalDate.refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Follow-up date must be in YYYY-MM-DD format"),
  lastContactDate: optionalDate.refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Last contact date must be in YYYY-MM-DD format"),
  assignedCounsellor: optionalText,
  budgetConcern: optionalText,
  scholarshipInterest: z.boolean().default(false),
  admissionMode: z.enum(["DIRECT", "AGENT"]).optional().or(z.literal("")),
  agentName: optionalText,
  notes: optionalText,
  followUpNotes: optionalText,
  lostReason: optionalText
}).superRefine((value, ctx) => {
  if (value.status === "LOST" && !value.lostReason?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lostReason"],
      message: "Lost reason is required when enquiry is marked as lost"
    });
  }
  if (value.nextFollowUpDate && value.enquiryDate && value.nextFollowUpDate < value.enquiryDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["nextFollowUpDate"],
      message: "Follow-up date cannot be earlier than enquiry date"
    });
  }
});

export type EnquiryPayload = z.infer<typeof enquiryPayloadSchema>;
