import { z } from "zod";

const optionalIsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal(""));

export const scholarshipPatchSchema = z.object({
  status: z.enum(["NOT_APPLIED", "APPLIED", "UNDER_PROCESS", "QUERY_BY_DEPARTMENT", "APPROVED", "REJECTED"]),
  scholarshipId: z.string().optional(),
  queryText: z.string().optional(),
  approvedDate: optionalIsoDate,
  creditedAmount: z.union([z.number(), z.string(), z.null()]).optional(),
  creditDate: optionalIsoDate,
  incomeCertificateOk: z.boolean().optional(),
  bankVerified: z.boolean().optional(),
  aadhaarVerified: z.boolean().optional(),
  casteCertificateOk: z.boolean().optional()
});

export const prnScvtPatchSchema = z.object({
  entRollNumber: z.string().optional(),
  admissionStatus: z.string().optional(),
  prnNumber: z.string().optional(),
  scvtRegistrationNumber: z.string().optional(),
  uploadDate: optionalIsoDate,
  verificationStatus: z.enum(["PENDING", "VERIFIED", "INCOMPLETE", "REJECTED"]),
  remark: z.string().optional()
});

export const examStatusPatchSchema = z.object({
  examFeePaid: z.boolean().optional(),
  hallTicketIssuedOn: optionalIsoDate,
  tradePracticalResult: z.enum(["NOT_DECLARED", "PASS", "FAIL"]).optional(),
  onlineTheoryResult: z.enum(["NOT_DECLARED", "PASS", "FAIL"]).optional(),
  practicalExamAppearance: z.enum(["NOT_APPEARED", "APPEARED"]).optional(),
  practicalAttemptCount: z.union([z.number(), z.string()]).optional(),
  theoryAttemptCount: z.union([z.number(), z.string()]).optional(),
  nextPracticalAttemptDate: optionalIsoDate,
  nextTheoryAttemptDate: optionalIsoDate,
  practicalReappearStatus: z.enum(["NOT_REQUIRED", "PENDING", "SCHEDULED", "COMPLETED", "NOT_ELIGIBLE"]).optional(),
  theoryReappearStatus: z.enum(["NOT_REQUIRED", "PENDING", "SCHEDULED", "COMPLETED", "NOT_ELIGIBLE"]).optional(),
  adminOverrideReason: z.string().optional(),
  resultPublished: z.boolean().optional(),
  resultDeclaredOn: optionalIsoDate,
  remark: z.string().optional()
});

const addPaymentSchema = z.object({
  action: z.literal("ADD_PAYMENT"),
  amountPaid: z.union([z.number(), z.string()]),
  payerType: z.enum(["STUDENT", "AGENT"]).optional(),
  agentCode: z.string().optional(),
  collectionScope: z.enum(["STUDENT_WISE", "BULK"]).optional(),
  paymentMode: z.string().min(1),
  allocationGroup: z.string().optional(),
  referenceNo: z.string().optional(),
  remark: z.string().optional(),
  transactionDate: optionalIsoDate
});

const updateProfileSchema = z.object({
  action: z.literal("UPDATE_PROFILE").optional(),
  collectionMode: z.enum(["DIRECT", "AGENT"]).optional(),
  instituteDecidedFee: z.union([z.number(), z.string()]).optional(),
  finalFees: z.union([z.number(), z.string()]).optional(),
  feesIfScholarship: z.union([z.number(), z.string(), z.null()]).optional(),
  feesIfNoScholarship: z.union([z.number(), z.string(), z.null()]).optional(),
  agentCommittedFee: z.union([z.number(), z.string(), z.null()]).optional(),
  scholarshipApplied: z.boolean().optional(),
  convertedFromAgent: z.boolean().optional(),
  conversionReason: z.string().optional(),
  reminderCount: z.union([z.number(), z.string()]).optional(),
  lastReminderDate: optionalIsoDate,
  practicalExamEligible: z.boolean().optional(),
  adminOverride: z.boolean().optional(),
  finalStatus: z.string().optional()
});

export const feePatchSchema = z.union([addPaymentSchema, updateProfileSchema]);

const undertakingReviewSchema = z.object({
  action: z.literal("REVIEW_SIGNED_UPLOAD"),
  status: z.enum(["VERIFIED", "REJECTED", "INCOMPLETE"])
});

const undertakingUpdateSchema = z.object({
  action: z.string().optional(),
  generatedUrl: z.string().optional(),
  generationStatus: z.enum(["PENDING", "VERIFIED", "INCOMPLETE", "REJECTED"]).optional(),
  generatedOn: optionalIsoDate,
  signedDocumentUrl: z.string().optional(),
  signedStatus: z.enum(["PENDING", "VERIFIED", "INCOMPLETE", "REJECTED"]).optional(),
  incrementPrintCount: z.boolean().optional()
});

export const undertakingPatchSchema = z.union([undertakingReviewSchema, undertakingUpdateSchema]);
