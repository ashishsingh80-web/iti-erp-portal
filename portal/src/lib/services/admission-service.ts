import {
  AdmissionMode,
  DocumentTypeCode,
  EducationLevel,
  Gender,
  ParentRelation,
  PaymentStatus,
  Prisma,
  ScholarshipStatus,
  StudentLifecycleStage,
  StudentStatus,
  VerificationStatus
} from "@prisma/client";
import { tradeUnitCatalog } from "@/lib/constants";
import { reserveGeneratedCode } from "@/lib/numbering-config";
import { prisma } from "@/lib/prisma";
import { buildSessionVariants, normalizeSessionLabel } from "@/lib/session-config";
import { createAuditLog } from "@/lib/services/audit-service";
import { refreshStudentDocumentStatus, uploadStudentDocumentWithoutAudit } from "@/lib/services/document-service";
import { markEnquiryConverted } from "@/lib/services/enquiry-service";
import { encryptSensitiveValue, maskAadhaar } from "@/lib/security";
import { buildUndertakingPrintUrl, undertakingTemplateDocumentId } from "@/lib/undertaking";
import { admissionPayloadSchema, type AdmissionPayload } from "@/lib/validations/admission";

function parseTradeKey(tradeKey: string) {
  const [instituteCode, tradeCode] = tradeKey.split("::");
  return { instituteCode, tradeCode };
}

/** Workshop seat capacity counts only learners still on-roll (not alumni/archived). */
export const workshopSeatLifecycleWhere: Pick<Prisma.StudentWhereInput, "lifecycleStage"> = {
  lifecycleStage: { in: [StudentLifecycleStage.ACTIVE, StudentLifecycleStage.PROMOTED] }
};

export function buildTradeCycleSessionVariants(session: string, durationYears: number) {
  const normalized = normalizeSessionLabel(session);
  const baseVariants = buildSessionVariants(normalized);

  if (durationYears <= 1 || !normalized.includes("-")) {
    return baseVariants;
  }

  const [startYearText] = normalized.split("-");
  const startYear = Number(startYearText);
  if (!Number.isFinite(startYear)) {
    return baseVariants;
  }

  const expectedFull = `${startYear}-${String(startYear + durationYears).slice(-2)}`;
  const oneYearStyleFull = `${startYear}-${String(startYear + 1).slice(-2)}`;

  return Array.from(
    new Set([
      ...baseVariants,
      ...buildSessionVariants(expectedFull),
      ...buildSessionVariants(oneYearStyleFull)
    ])
  );
}

/**
 * For a 2-year cycle label like `2026-28`, returns the prior cycle `2025-27`. Used to include
 * learners still stored under the old session label (e.g. not yet promoted) alongside the new cycle.
 */
export function previousTwoYearCycleSession(session: string): string | null {
  const normalized = normalizeSessionLabel((session || "").trim());
  if (!normalized.includes("-")) return null;
  const [left] = normalized.split("-");
  const startYear = Number(left);
  if (!Number.isFinite(startYear)) return null;
  const prevStart = startYear - 1;
  const endYear = prevStart + 2;
  return `${prevStart}-${String(endYear).slice(-2)}`;
}

/**
 * Who counts against workshop seats for this admission cycle:
 * - All 1st/2nd-year students under the current cycle session (incl. promoted 2nd years — their
 *   `session` is advanced via `promoteStudentToSecondYear` to match the new batch label).
 * - Plus all 1st/2nd under the prior cycle session (legacy / not yet session-bumped), so overlap
 *   with the outgoing batch still works.
 */
function buildTwoYearWorkshopSeatOr(session: string): Prisma.StudentWhereInput[] {
  const variantsS = buildTradeCycleSessionVariants(session, 2);
  const prev = previousTwoYearCycleSession(session);
  const variantsPrev = prev ? buildTradeCycleSessionVariants(prev, 2) : [];
  const orBranch: Prisma.StudentWhereInput[] = [];
  if (variantsS.length) {
    orBranch.push({ session: { in: variantsS }, yearLabel: { in: ["1st", "2nd"] } });
  }
  if (variantsPrev.length) {
    orBranch.push({ session: { in: variantsPrev }, yearLabel: { in: ["1st", "2nd"] } });
  }
  return orBranch;
}

async function loadTwoYearConcurrentSeatUsageByUnit(
  instituteId: string,
  tradeId: string,
  session: string
): Promise<Map<number, number>> {
  const base = { instituteId, tradeId, deletedAt: null, ...workshopSeatLifecycleWhere };
  const orBranch = buildTwoYearWorkshopSeatOr(session);
  if (!orBranch.length) {
    return new Map();
  }

  const rows = await prisma.student.groupBy({
    by: ["unitNumber"],
    where: {
      ...base,
      OR: orBranch
    },
    _count: { _all: true }
  });

  const usedByUnit = new Map<number, number>();
  for (const row of rows) {
    if (row.unitNumber != null) {
      usedByUnit.set(row.unitNumber, row._count._all);
    }
  }
  return usedByUnit;
}

/** Total students counted against seat capacity for a 2-year trade in `session` (all units). */
export async function countTwoYearConcurrentSeatUsers(instituteId: string, tradeId: string, session: string): Promise<number> {
  const byUnit = await loadTwoYearConcurrentSeatUsageByUnit(instituteId, tradeId, session);
  let sum = 0;
  for (const n of byUnit.values()) sum += n;
  return sum;
}

export async function countStudentsOnUnitForAdmission(params: {
  instituteId: string;
  tradeId: string;
  tradeKey: string;
  unitNumber: number;
  session: string;
  yearLabel: string;
  excludeStudentId?: string;
}): Promise<number> {
  const tradeConfig = tradeUnitCatalog[params.tradeKey];
  if (!tradeConfig) return 0;

  const base: Prisma.StudentWhereInput = {
    instituteId: params.instituteId,
    tradeId: params.tradeId,
    unitNumber: params.unitNumber,
    deletedAt: null,
    ...workshopSeatLifecycleWhere,
    ...(params.excludeStudentId ? { NOT: { id: params.excludeStudentId } } : {})
  };

  if (tradeConfig.durationYears <= 1) {
    const variants = buildTradeCycleSessionVariants(params.session, 1);
    return prisma.student.count({
      where: {
        ...base,
        ...(variants.length ? { session: { in: variants } } : {}),
        yearLabel: params.yearLabel
      }
    });
  }

  const orBranch = buildTwoYearWorkshopSeatOr(params.session);
  if (!orBranch.length) {
    return 0;
  }

  return prisma.student.count({
    where: {
      ...base,
      OR: orBranch
    }
  });
}

function toCapitalizedWords(value?: string | null) {
  if (!value) return null;
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function toUpperWords(value?: string | null) {
  if (!value) return null;
  return value.trim().toUpperCase();
}

function parseDdMmYyyyToDate(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    throw new Error("Date of Birth must be in DD/MM/YYYY format");
  }

  const [, dd, mm, yyyy] = match;
  const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(yyyy) ||
    date.getUTCMonth() + 1 !== Number(mm) ||
    date.getUTCDate() !== Number(dd)
  ) {
    throw new Error("Date of Birth is invalid");
  }

  return date;
}

function parseOptionalDate(value?: string | null) {
  if (!value?.trim()) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Admission date is invalid");
  }
  return date;
}

function buildStructuredAddress(payload: AdmissionPayload) {
  return [payload.areaVillage, payload.ward, payload.block, payload.tehsil, payload.district, payload.stateName, payload.country]
    .map((item) => toCapitalizedWords(item) || "")
    .filter(Boolean)
    .join(", ");
}

type AdmissionDocumentFiles = {
  studentPhoto?: File | null;
  qualificationDocuments?: Array<{ index: number; file: File }>;
  casteCertificate?: File | null;
  incomeCertificate?: File | null;
};

export async function getUnitAvailability(tradeId: string, session: string, yearLabel?: string) {
  const { instituteCode, tradeCode } = parseTradeKey(tradeId);

  if (!instituteCode || !tradeCode) {
    return [];
  }

  const tradeConfig = tradeUnitCatalog[tradeId];
  if (!tradeConfig) {
    return [];
  }

  const institute = await prisma.institute.findUnique({
    where: { instituteCode }
  });

  if (!institute) {
    return [];
  }

  const trade = await prisma.trade.findFirst({
    where: {
      instituteId: institute.id,
      tradeCode,
      isActive: true
    }
  });

  if (!trade) {
    return [];
  }

  const sessionVariants = buildTradeCycleSessionVariants(session, tradeConfig.durationYears);

  let usedByUnit: Map<number, number>;

  if (tradeConfig.durationYears === 2) {
    usedByUnit = await loadTwoYearConcurrentSeatUsageByUnit(institute.id, trade.id, session);
  } else {
    const students = await prisma.student.groupBy({
      by: ["unitNumber"],
      where: {
        instituteId: institute.id,
        tradeId: trade.id,
        ...(sessionVariants.length ? { session: { in: sessionVariants } } : {}),
        ...(tradeConfig.durationYears <= 1 && yearLabel ? { yearLabel } : {}),
        deletedAt: null,
        ...workshopSeatLifecycleWhere
      },
      _count: {
        _all: true
      }
    });
    usedByUnit = new Map<number, number>();
    for (const row of students) {
      if (row.unitNumber) {
        usedByUnit.set(row.unitNumber, row._count._all);
      }
    }
  }

  return Array.from({ length: tradeConfig.unitCount }, (_, index) => {
    const unitNumber = index + 1;
    const used = usedByUnit.get(unitNumber) || 0;
    const remaining = Math.max(tradeConfig.seatsPerUnit - used, 0);

    return {
      unitNumber,
      capacity: tradeConfig.seatsPerUnit,
      used,
      remaining,
      isFull: remaining <= 0
    };
  });
}

export async function createAdmission(rawPayload: unknown, currentUserId?: string | null, files: AdmissionDocumentFiles = {}) {
  const payload: AdmissionPayload = admissionPayloadSchema.parse(rawPayload);
  const { instituteCode, tradeCode } = parseTradeKey(payload.tradeId);

  if (!instituteCode || !tradeCode) {
    throw new Error("Trade selection is invalid");
  }

  if (payload.instituteId !== instituteCode) {
    throw new Error("Selected institute and trade do not match");
  }

  const institute = await prisma.institute.findUnique({
    where: { instituteCode: payload.instituteId }
  });

  if (!institute) {
    throw new Error(`Institute not found: ${payload.instituteId}`);
  }

  const trade = await prisma.trade.findFirst({
    where: {
      instituteId: institute.id,
      tradeCode,
      isActive: true
    }
  });

  if (!trade) {
    throw new Error(`Trade not found for ${payload.tradeId}`);
  }

  const tradeConfig = tradeUnitCatalog[payload.tradeId];
  if (!tradeConfig) {
    throw new Error(`Unit configuration not found for ${payload.tradeId}`);
  }

  const normalizedSession =
    buildTradeCycleSessionVariants(payload.session, tradeConfig.durationYears)[0] ||
    normalizeSessionLabel(payload.session);

  if (payload.unitNumber < 1 || payload.unitNumber > tradeConfig.unitCount) {
    throw new Error(`Selected unit is invalid for ${payload.tradeId}`);
  }

  if (payload.yearLabel === "2nd" && tradeConfig.durationYears < 2) {
    throw new Error("This trade does not have 2nd year admissions");
  }

  const dateOfBirth = parseDdMmYyyyToDate(payload.dateOfBirth);

  const duplicateStudent = await prisma.student.findFirst({
    where: {
      deletedAt: null,
      OR: [
        {
          mobile: payload.mobile,
          dateOfBirth
        },
        {
          fullName: toUpperWords(payload.fullName) || payload.fullName,
          fatherName: toUpperWords(payload.fatherName) || payload.fatherName,
          dateOfBirth
        }
      ]
    },
    select: {
      id: true,
      studentCode: true,
      fullName: true
    }
  });

  if (duplicateStudent) {
    throw new Error(`Possible duplicate admission found for ${duplicateStudent.fullName} (${duplicateStudent.studentCode})`);
  }

  const agent =
    payload.admissionMode === "AGENT" && payload.agentId
      ? await prisma.agent.findUnique({
          where: { agentCode: payload.agentId }
        })
      : null;

  if (payload.admissionMode === "AGENT" && payload.agentId && !agent) {
    throw new Error(`Agent not found: ${payload.agentId}`);
  }

  const studentCode = await reserveGeneratedCode("student", {
    institute: institute.instituteCode,
    trade: trade.tradeCode,
    session: normalizedSession
  });
  const admissionCompletionStatus = payload.isPassed ? StudentStatus.UNDER_REVIEW : StudentStatus.DRAFT;
  const eligibilityStatus = payload.isPassed ? VerificationStatus.PENDING : VerificationStatus.REJECTED;
  const finalFees = trade.standardFees ?? 0;

  const existingUnitCount = await countStudentsOnUnitForAdmission({
    instituteId: institute.id,
    tradeId: trade.id,
    tradeKey: payload.tradeId,
    unitNumber: payload.unitNumber,
    session: normalizedSession,
    yearLabel: payload.yearLabel
  });

  if (existingUnitCount >= tradeConfig.seatsPerUnit) {
    throw new Error(`Unit ${payload.unitNumber} is already full for ${trade.name}. Allowed seats: ${tradeConfig.seatsPerUnit}`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const duplicateInsideTx = await tx.student.findFirst({
      where: {
        deletedAt: null,
        OR: [
          {
            mobile: payload.mobile,
            dateOfBirth
          },
          {
            fullName: toUpperWords(payload.fullName) || payload.fullName,
            fatherName: toUpperWords(payload.fatherName) || payload.fatherName,
            dateOfBirth
          }
        ]
      },
      select: {
        id: true,
        studentCode: true,
        fullName: true
      }
    });
    if (duplicateInsideTx) {
      throw new Error(`Possible duplicate admission found for ${duplicateInsideTx.fullName} (${duplicateInsideTx.studentCode})`);
    }

    const student = await tx.student.create({
      data: {
        studentCode,
        admissionNumber: studentCode,
        enrollmentNumber: payload.enrollmentNumber || null,
        instituteId: institute.id,
        tradeId: trade.id,
        unitNumber: payload.unitNumber,
        agentId: agent?.id,
        admissionMode: payload.admissionMode === "AGENT" ? AdmissionMode.AGENT : AdmissionMode.DIRECT,
        session: normalizedSession,
        yearLabel: payload.yearLabel,
        paymentMode: null,
        status: admissionCompletionStatus,
        fullName: toUpperWords(payload.fullName) || payload.fullName,
        dateOfBirth,
        mobile: payload.mobile,
        alternateMobile: payload.alternateMobile || null,
        email: payload.email || null,
        gender: payload.gender ? (payload.gender as Gender) : null,
        category: payload.category ? toCapitalizedWords(payload.category) : null,
        caste: payload.caste ? toCapitalizedWords(payload.caste) : null,
        religion: payload.religion ? toCapitalizedWords(payload.religion) : null,
        country: toCapitalizedWords(payload.country),
        stateName: toCapitalizedWords(payload.stateName),
        district: toCapitalizedWords(payload.district),
        tehsil: toCapitalizedWords(payload.tehsil),
        block: toCapitalizedWords(payload.block),
        ward: payload.ward?.trim() ? toCapitalizedWords(payload.ward) : null,
        areaVillage: payload.areaVillage?.trim() ? toCapitalizedWords(payload.areaVillage) : null,
        address: buildStructuredAddress(payload),
        fatherName: toUpperWords(payload.fatherName),
        motherName: toUpperWords(payload.motherName),
        incomeDetails: payload.incomeDetails || null,
        domicileDetails: payload.domicileDetails || null,
        minorityStatus: payload.minorityStatus,
        disabilityStatus: payload.disabilityStatus,
        maritalStatus: payload.maritalStatus || null,
        signatureUrl: null,
        admissionDate: parseOptionalDate(payload.admissionDate),
        admissionType: payload.admissionType || null,
        admissionStatusLabel: payload.admissionStatusLabel || null,
        seatType: payload.seatType || null,
        rollNumber: payload.rollNumber || null,
        batchLabel: payload.batchLabel || null,
        shiftLabel: payload.shiftLabel || null,
        aadhaarMasked: maskAadhaar(payload.studentAadhaar),
        aadhaarEncrypted: encryptSensitiveValue(payload.studentAadhaar),
        admissionFormStatus: VerificationStatus.PENDING,
        documentsStatus: VerificationStatus.PENDING,
        undertakingStatus: VerificationStatus.PENDING,
        eligibilityStatus,
        internalNotes: payload.notes || null
      }
    });

    const parent = await tx.parentIdentity.create({
      data: {
        studentId: student.id,
        relation: payload.parentRelation as ParentRelation,
        name: toUpperWords(payload.parentName) || "PARENT / GUARDIAN",
        mobile: payload.parentMobile || null,
        aadhaarMasked: payload.parentAadhaar ? maskAadhaar(payload.parentAadhaar) : null,
        aadhaarEncrypted: payload.parentAadhaar ? encryptSensitiveValue(payload.parentAadhaar) : null
      }
    });

    await tx.educationQualification.createMany({
      data: payload.qualifications.map((qualification) => ({
        studentId: student.id,
        level: qualification.qualificationLevel as EducationLevel,
        schoolName: qualification.schoolName ? toCapitalizedWords(qualification.schoolName) : null,
        boardUniversity: toCapitalizedWords(qualification.boardUniversity),
        certificateNumber: qualification.certificateNumber || null,
        rollNumber: qualification.rollNumber || null,
        passingYear: typeof qualification.passingYear === "number" ? qualification.passingYear : null,
        percentage: typeof qualification.percentage === "number" ? qualification.percentage : null,
        isPassed: qualification.qualificationLevel === "TENTH" ? payload.isPassed : true,
        minimumEligibility: qualification.qualificationLevel === "TENTH",
        verificationStatus: VerificationStatus.PENDING
      }))
    });

    await tx.feeProfile.create({
      data: {
        studentId: student.id,
        collectionMode: payload.admissionMode === "AGENT" ? "AGENT" : "DIRECT",
        instituteDecidedFee: finalFees,
        finalFees,
        feesIfNoScholarship: finalFees,
        paidAmount: 0,
        dueAmount: finalFees,
        paymentStatus: PaymentStatus.UNPAID
      }
    });

    await tx.prnScvtRecord.create({
      data: {
        studentId: student.id,
        verificationStatus: VerificationStatus.PENDING
      }
    });

    await tx.examStatusRecord.create({
      data: {
        studentId: student.id
      }
    });

    await tx.scholarshipRecord.create({
      data: {
        studentId: student.id,
        status: payload.scholarshipApplied ? ScholarshipStatus.APPLIED : ScholarshipStatus.NOT_APPLIED,
        incomeCertificateNumber: payload.scholarshipApplied ? payload.incomeCertificateNumber || null : null
      }
    });

    await tx.undertakingRecord.create({
      data: {
        studentId: student.id,
        templateDocumentId: undertakingTemplateDocumentId,
        generatedUrl: buildUndertakingPrintUrl(student.id),
        generationStatus: VerificationStatus.VERIFIED,
        generatedOn: new Date(),
        signedStatus: VerificationStatus.PENDING
      }
    });

    return student;
  });

  if (files.studentPhoto) {
    await uploadStudentDocumentWithoutAudit({
      studentId: result.id,
      documentType: DocumentTypeCode.STUDENT_PHOTO,
      ownerType: "STUDENT",
      file: files.studentPhoto
    });
  }

  if (files.qualificationDocuments?.length) {
    for (const item of files.qualificationDocuments) {
      const qualification = payload.qualifications[item.index];
      if (!qualification) continue;

      await uploadStudentDocumentWithoutAudit({
        studentId: result.id,
        documentType:
          qualification.qualificationLevel === "TENTH" ? DocumentTypeCode.TENTH_MARKSHEET : DocumentTypeCode.OTHER,
        ownerType: "STUDENT",
        remarks:
          qualification.qualificationLevel === "TENTH"
            ? "10th qualification upload from admission"
            : `${qualification.qualificationLevel} qualification upload`,
        file: item.file
      });
    }
  }

  if (files.casteCertificate && payload.category && payload.category !== "GENERAL") {
    await uploadStudentDocumentWithoutAudit({
      studentId: result.id,
      documentType: DocumentTypeCode.CASTE_CERTIFICATE,
      ownerType: "STUDENT",
      file: files.casteCertificate
    });
  }

  if (files.incomeCertificate && payload.scholarshipApplied) {
    await uploadStudentDocumentWithoutAudit({
      studentId: result.id,
      documentType: DocumentTypeCode.INCOME_CERTIFICATE,
      ownerType: "STUDENT",
      remarks: payload.incomeCertificateNumber || undefined,
      file: files.incomeCertificate
    });
  }

  await refreshStudentDocumentStatus(result.id);

  if (payload.sourceEnquiryId) {
    await markEnquiryConverted(payload.sourceEnquiryId, {
      id: result.id,
      studentCode: result.studentCode
    });
  }

  await createAuditLog({
    userId: currentUserId,
    studentId: result.id,
    module: "ADMISSIONS",
    action: "CREATE_ADMISSION",
    metadata: {
      instituteCode: institute.instituteCode,
      tradeCode: trade.tradeCode
    }
  });

  return {
    ok: true,
    studentId: result.id,
    studentCode: result.studentCode,
    status: result.status,
    message: "Admission created successfully"
  };
}
