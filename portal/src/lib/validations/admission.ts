import { z } from "zod";

const optionalText = z.string().trim().optional().or(z.literal(""));

export const aadhaarSchema = z
  .string()
  .trim()
  .regex(/^\d{12}$/, "Aadhaar must be exactly 12 digits");

const optionalAadhaarSchema = optionalText.refine((value) => !value || /^\d{12}$/.test(value), "Aadhaar must be exactly 12 digits");
const dobSchema = z
  .string()
  .trim()
  .regex(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, "Date of Birth must be in DD/MM/YYYY format");
const qualificationSchema = z.object({
  qualificationLevel: z.enum(["TENTH", "TWELFTH", "ITI", "DIPLOMA", "GRADUATION", "OTHER"]),
  schoolName: optionalText,
  boardUniversity: optionalText,
  certificateNumber: optionalText,
  passingYear: z.union([z.coerce.number().min(1990).max(2100), z.literal(""), z.undefined()]).optional(),
  percentage: z.union([z.coerce.number().min(0).max(100), z.literal(""), z.undefined()]).optional(),
  rollNumber: optionalText
});

export const admissionPayloadSchema = z.object({
  sourceEnquiryId: optionalText,
  instituteId: z.string().min(1, "Institute is required"),
  tradeId: z.string().min(1, "Trade is required"),
  enrollmentNumber: optionalText,
  unitNumber: z.coerce.number().int().min(1, "Unit is required"),
  session: z.string().min(1, "Session is required"),
  yearLabel: z.string().min(1, "Year is required"),
  admissionDate: optionalText,
  admissionType: optionalText,
  admissionStatusLabel: optionalText,
  seatType: optionalText,
  rollNumber: optionalText,
  batchLabel: optionalText,
  shiftLabel: optionalText,
  fullName: z.string().min(2, "Student name is required"),
  dateOfBirth: dobSchema,
  mobile: z.string().regex(/^\d{10}$/, "Mobile must be 10 digits"),
  alternateMobile: optionalText.refine((value) => !value || /^\d{10}$/.test(value), "Alternate mobile must be 10 digits"),
  email: optionalText.refine((value) => !value || z.string().email().safeParse(value).success, "Enter a valid email"),
  gender: optionalText,
  category: optionalText,
  caste: optionalText,
  religion: optionalText,
  incomeDetails: optionalText,
  domicileDetails: optionalText,
  minorityStatus: z.boolean().default(false),
  disabilityStatus: z.boolean().default(false),
  maritalStatus: optionalText,
  country: optionalText,
  stateName: optionalText,
  district: optionalText,
  tehsil: optionalText,
  block: optionalText,
  ward: optionalText,
  areaVillage: optionalText,
  address: optionalText,
  fatherName: optionalText,
  motherName: optionalText,
  studentAadhaar: aadhaarSchema,
  parentRelation: z.enum(["FATHER", "MOTHER", "GUARDIAN"]),
  parentName: optionalText,
  parentMobile: optionalText.refine((value) => !value || /^\d{10}$/.test(value), "Parent mobile must be 10 digits"),
  parentAadhaar: optionalAadhaarSchema,
  qualifications: z.array(qualificationSchema).min(1, "At least one qualification is required"),
  isPassed: z.boolean().refine((value) => value, "Student must be 10th pass"),
  scholarshipApplied: z.boolean().default(false),
  incomeCertificateNumber: optionalText,
  admissionMode: z.enum(["DIRECT", "AGENT"]),
  agentId: optionalText,
  notes: optionalText
}).superRefine((value, ctx) => {
  if (!value.qualifications.some((item) => item.qualificationLevel === "TENTH")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["qualifications"],
      message: "10th qualification entry is required"
    });
  }

  if (value.scholarshipApplied && !value.incomeCertificateNumber?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["incomeCertificateNumber"],
      message: "Income certificate number is required when scholarship is applied"
    });
  }
});

export type AdmissionPayload = z.infer<typeof admissionPayloadSchema>;
