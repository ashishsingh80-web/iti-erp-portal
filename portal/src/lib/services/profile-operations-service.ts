import { mkdir, writeFile } from "fs/promises";
import { createHash } from "crypto";
import path from "path";
import {
  ExamAppearanceStatus,
  ExamResultStatus,
  FeeCollectionMode,
  FeeCollectionScope,
  FeePayerType,
  PaymentStatus,
  Prisma,
  ReappearStatus,
  ScholarshipStatus,
  VerificationStatus
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildFeeReceiptNumber, createFeeReceiptAccountEntry } from "@/lib/services/accounts-service";
import { isAccountsDateClosed } from "@/lib/services/accounts-service";
import { createAuditLog } from "@/lib/services/audit-service";
import { refreshStudentDocumentStatus } from "@/lib/services/document-service";
import { reserveGeneratedCode } from "@/lib/numbering-config";
import { buildUndertakingPrintUrl, undertakingTemplateDocumentId } from "@/lib/undertaking";

function parseAmount(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  if (Number.isNaN(amount) || amount < 0) {
    throw new Error("Amount must be a valid positive number");
  }
  return amount;
}

function parseDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error("Date is invalid");
  }
  return date;
}

function normalizeAttemptCount(value: unknown, label: string) {
  const number = Number(value ?? 0);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${label} must be a valid non-negative whole number`);
  }
  return number;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function derivePaymentStatus(finalFees: number, paidAmount: number): PaymentStatus {
  if (paidAmount <= 0) return PaymentStatus.UNPAID;
  if (paidAmount >= finalFees) return PaymentStatus.PAID;
  return PaymentStatus.PARTIAL;
}

function calculateEffectiveFee(input: {
  collectionMode: FeeCollectionMode;
  instituteDecidedFee: number;
  feesIfScholarship: number | null;
  feesIfNoScholarship: number | null;
  agentCommittedFee: number | null;
  scholarshipApplied: boolean;
  scholarshipApproved: boolean;
  convertedFromAgent: boolean;
}) {
  const instituteFee = input.feesIfNoScholarship ?? input.instituteDecidedFee;
  const scholarshipFee = input.feesIfScholarship ?? instituteFee;

  if (input.collectionMode === FeeCollectionMode.AGENT && !input.convertedFromAgent && input.agentCommittedFee !== null) {
    return input.agentCommittedFee;
  }

  if (input.scholarshipApplied && input.scholarshipApproved) {
    return scholarshipFee;
  }

  return instituteFee;
}

function normalizePaymentMode(raw: string) {
  const mode = raw.trim().toUpperCase();
  if (mode === "BANK") return "BANK_TRANSFER";
  if (mode === "CHEQUE") return "ONLINE";
  return mode;
}

export async function addFeePaymentInTx(
  tx: Prisma.TransactionClient,
  input: {
    studentId: string;
    amountPaid: number;
    payerType: FeePayerType;
    collectionScope: FeeCollectionScope;
    paymentMode: string;
    transactionDate: Date;
    agentId?: string | null;
    allocationGroup?: string | null;
    referenceNo?: string | null;
    remark?: string | null;
    createdById?: string | null;
  }
) {
  const receiptNumber = await reserveGeneratedCode("receipt", {
    date: input.transactionDate
  });

  const createdTransaction = await tx.feeTransaction.create({
    data: {
      studentId: input.studentId,
      agentId: input.agentId || null,
      receiptNumber,
      transactionDate: input.transactionDate,
      amountPaid: input.amountPaid,
      payerType: input.payerType,
      collectionScope: input.collectionScope,
      paymentMode: normalizePaymentMode(input.paymentMode),
      allocationGroup: input.allocationGroup || null,
      referenceNo: input.referenceNo || null,
      remark: input.remark || null
    }
  });

  const student = await tx.student.findUnique({
    where: { id: input.studentId },
    select: {
      id: true,
      studentCode: true,
      fullName: true
    }
  });

  if (student) {
    await createFeeReceiptAccountEntry(tx, {
      feeTransactionId: createdTransaction.id,
      studentId: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      amount: input.amountPaid,
      paymentMode: normalizePaymentMode(input.paymentMode),
      transactionDate: input.transactionDate,
      referenceNo: input.referenceNo || null,
      remark: input.remark || null,
      createdById: input.createdById || null
    });
  }

  const feeAfterIncrement = await tx.feeProfile.update({
    where: { studentId: input.studentId },
    data: {
      paidAmount: {
        increment: input.amountPaid
      }
    },
    select: {
      finalFees: true,
      paidAmount: true
    }
  });

  const nextPaidAmount = Number(feeAfterIncrement.paidAmount);
  const dueAmount = Math.max(Number(feeAfterIncrement.finalFees) - nextPaidAmount, 0);
  const paymentStatus = derivePaymentStatus(Number(feeAfterIncrement.finalFees), nextPaidAmount);

  await tx.feeProfile.update({
    where: { studentId: input.studentId },
    data: {
      dueAmount,
      paymentStatus
    }
  });

  return {
    transactionId: createdTransaction.id,
    receiptNumber: createdTransaction.receiptNumber || buildFeeReceiptNumber(createdTransaction.id, createdTransaction.transactionDate)
  };
}

export async function updateFeeModule(studentId: string, rawPayload: unknown, currentUserId?: string | null) {
  const payload = rawPayload as {
    action?: "UPDATE_PROFILE" | "ADD_PAYMENT";
    collectionMode?: FeeCollectionMode | string;
    instituteDecidedFee?: number | string;
    finalFees?: number | string;
    feesIfScholarship?: number | string | null;
    feesIfNoScholarship?: number | string | null;
    agentCommittedFee?: number | string | null;
    scholarshipApplied?: boolean;
    convertedFromAgent?: boolean;
    conversionReason?: string | null;
    reminderCount?: number | string;
    lastReminderDate?: string;
    practicalExamEligible?: boolean;
    adminOverride?: boolean;
    finalStatus?: string | null;
    amountPaid?: number | string;
    payerType?: FeePayerType | string;
    agentCode?: string;
    collectionScope?: FeeCollectionScope | string;
    allocationGroup?: string;
    paymentMode?: string;
    referenceNo?: string;
    remark?: string;
    transactionDate?: string;
  };

  const feeProfile = await prisma.feeProfile.findUnique({
    where: { studentId }
  });

  if (!feeProfile) {
    throw new Error("Fee profile not found");
  }

  const scholarship = await prisma.scholarshipRecord.findUnique({
    where: { studentId }
  });
  let createdTransactionId: string | null = null;
  let createdReceiptNumber: string | null = null;

  if (payload.action === "ADD_PAYMENT") {
    const amountPaid = parseAmount(payload.amountPaid);
    if (!amountPaid || amountPaid <= 0) {
      throw new Error("Payment amount must be greater than 0");
    }
    const currentDueAmount = Number(feeProfile.dueAmount ?? 0);
    if (amountPaid > currentDueAmount) {
      throw new Error("Payment amount cannot exceed current due amount");
    }
    if (!payload.paymentMode?.trim()) {
      throw new Error("Payment mode is required");
    }
    const paymentMode = normalizePaymentMode(payload.paymentMode);
    const payerType =
      payload.payerType === FeePayerType.AGENT || payload.payerType === "AGENT"
        ? FeePayerType.AGENT
        : FeePayerType.STUDENT;
    const collectionScope =
      payload.collectionScope === FeeCollectionScope.BULK || payload.collectionScope === "BULK"
        ? FeeCollectionScope.BULK
        : FeeCollectionScope.STUDENT_WISE;
    const agent =
      payload.agentCode && payerType === FeePayerType.AGENT
        ? await prisma.agent.findUnique({
            where: { agentCode: payload.agentCode }
          })
        : null;

    const transactionDate = parseDate(payload.transactionDate) || new Date();
    if (await isAccountsDateClosed(transactionDate)) {
      throw new Error("Selected fee date is already closed in accounts");
    }
    await prisma.$transaction(async (tx) => {
      const payment = await addFeePaymentInTx(tx, {
        studentId,
        amountPaid,
        payerType,
        collectionScope,
        paymentMode,
        transactionDate,
        agentId: agent?.id || null,
        allocationGroup: payload.allocationGroup?.trim() || null,
        referenceNo: payload.referenceNo?.trim() || null,
        remark: payload.remark?.trim() || null,
        createdById: currentUserId || null
      });
      createdTransactionId = payment.transactionId;
      createdReceiptNumber = payment.receiptNumber;

    });
    await createAuditLog({
      userId: currentUserId,
      studentId,
      module: "FEES",
      action: "ADD_PAYMENT",
      metadata: {
        amountPaid,
        payerType,
        paymentMode,
        transactionDate: transactionDate.toISOString()
      }
    });
  } else {
    // PATCH semantics: only change fields explicitly present in the payload.
    // Without this, omitted fields can accidentally clear approval / review-related flags.
    const hasField = (key: string) => Object.prototype.hasOwnProperty.call(payload, key);

    const collectionMode = hasField("collectionMode")
      ? payload.collectionMode === FeeCollectionMode.AGENT || payload.collectionMode === "AGENT"
        ? FeeCollectionMode.AGENT
        : FeeCollectionMode.DIRECT
      : feeProfile.collectionMode;

    const existingInstituteDecidedFee = Number(feeProfile.instituteDecidedFee ?? feeProfile.finalFees);
    const instituteDecidedFee = hasField("instituteDecidedFee") ? parseAmount(payload.instituteDecidedFee) ?? existingInstituteDecidedFee : existingInstituteDecidedFee;

    const existingFeesIfScholarship = feeProfile.feesIfScholarship !== null ? Number(feeProfile.feesIfScholarship) : null;
    const feesIfScholarship = hasField("feesIfScholarship") ? parseAmount(payload.feesIfScholarship) : existingFeesIfScholarship;

    const existingFeesIfNoScholarship = feeProfile.feesIfNoScholarship !== null ? Number(feeProfile.feesIfNoScholarship) : instituteDecidedFee;
    const feesIfNoScholarship = hasField("feesIfNoScholarship") ? parseAmount(payload.feesIfNoScholarship) ?? existingFeesIfNoScholarship : existingFeesIfNoScholarship;

    const existingAgentCommittedFee = feeProfile.agentCommittedFee !== null ? Number(feeProfile.agentCommittedFee) : null;
    const agentCommittedFee = hasField("agentCommittedFee") ? parseAmount(payload.agentCommittedFee) : existingAgentCommittedFee;

    const scholarshipApplied =
      typeof payload.scholarshipApplied === "boolean" ? payload.scholarshipApplied : feeProfile.scholarshipApplied;
    const convertedFromAgent =
      typeof payload.convertedFromAgent === "boolean" ? payload.convertedFromAgent : feeProfile.convertedFromAgent;
    const scholarshipApproved = scholarship?.status === ScholarshipStatus.APPROVED;
    const finalFees = calculateEffectiveFee({
      collectionMode,
      instituteDecidedFee,
      feesIfScholarship,
      feesIfNoScholarship,
      agentCommittedFee,
      scholarshipApplied,
      scholarshipApproved,
      convertedFromAgent
    });

    const paidAmount = Number(feeProfile.paidAmount);
    const dueAmount = Math.max(finalFees - paidAmount, 0);
    const paymentStatus = derivePaymentStatus(finalFees, paidAmount);

    await prisma.$transaction(async (tx) => {
      const adminOverride = hasField("adminOverride") ? Boolean(payload.adminOverride) : feeProfile.adminOverride;
      const practicalExamEligibleFromPayload = hasField("practicalExamEligible")
        ? Boolean(payload.practicalExamEligible)
        : feeProfile.practicalExamEligible;
      const practicalExamEligible = Boolean(adminOverride) || practicalExamEligibleFromPayload || dueAmount <= 0;

      const finalStatus = hasField("finalStatus") ? payload.finalStatus?.trim() || null : feeProfile.finalStatus;
      const shouldUpdateConversionDate = hasField("convertedFromAgent");
      const shouldUpdateConversionReason = hasField("conversionReason");
      const conversionDate = shouldUpdateConversionDate ? (convertedFromAgent ? new Date() : null) : feeProfile.conversionDate;
      const conversionReason = shouldUpdateConversionReason ? payload.conversionReason?.trim() || null : feeProfile.conversionReason;

      const shouldUpdateReminderCount = hasField("reminderCount");
      const reminderCount = shouldUpdateReminderCount ? Number(payload.reminderCount || 0) : feeProfile.reminderCount;
      const shouldUpdateLastReminderDate = hasField("lastReminderDate");
      const lastReminderDate = shouldUpdateLastReminderDate ? parseDate(payload.lastReminderDate) : feeProfile.lastReminderDate;

      await tx.feeProfile.update({
        where: { studentId },
        data: {
          collectionMode,
          instituteDecidedFee,
          finalFees,
          feesIfScholarship,
          feesIfNoScholarship,
          agentCommittedFee,
          scholarshipApplied,
          convertedFromAgent,
          ...(shouldUpdateConversionDate ? { conversionDate } : {}),
          ...(shouldUpdateConversionReason ? { conversionReason } : {}),
          ...(shouldUpdateReminderCount ? { reminderCount } : {}),
          ...(shouldUpdateLastReminderDate ? { lastReminderDate } : {}),
          dueAmount,
          paymentStatus,
          practicalExamEligible,
          adminOverride,
          finalStatus
        }
      });

    });
    await createAuditLog({
      userId: currentUserId,
      studentId,
      module: "FEES",
      action: "UPDATE_FEE_PROFILE",
      metadata: {
        finalFees,
        collectionMode,
        dueAmount,
        paymentStatus
      }
    });
  }

  const updated = await prisma.feeProfile.findUnique({
    where: { studentId },
    include: {
      student: true
    }
  });

  const transactions = await prisma.feeTransaction.findMany({
    where: { studentId },
    orderBy: {
      transactionDate: "desc"
    },
    take: 10
  });

  return {
    feeProfile: {
      feesIfScholarship: updated?.feesIfScholarship?.toString() || null,
      feesIfNoScholarship: updated?.feesIfNoScholarship?.toString() || null,
      collectionMode: updated?.collectionMode || FeeCollectionMode.DIRECT,
      instituteDecidedFee: updated?.instituteDecidedFee?.toString() || null,
      agentCommittedFee: updated?.agentCommittedFee?.toString() || null,
      scholarshipApplied: updated?.scholarshipApplied || false,
      convertedFromAgent: updated?.convertedFromAgent || false,
      conversionDate: updated?.conversionDate?.toISOString() || null,
      conversionReason: updated?.conversionReason || null,
      reminderCount: updated?.reminderCount || 0,
      lastReminderDate: updated?.lastReminderDate?.toISOString() || null,
      finalFees: updated?.finalFees.toString() || "0",
      paidAmount: updated?.paidAmount.toString() || "0",
      dueAmount: updated?.dueAmount.toString() || "0",
      paymentStatus: updated?.paymentStatus || PaymentStatus.UNPAID,
      practicalExamEligible: updated?.practicalExamEligible || false,
      adminOverride: updated?.adminOverride || false,
      finalStatus: updated?.finalStatus || null,
      transactions: transactions.map((item) => ({
        id: item.id,
        receiptNo: item.receiptNumber || buildFeeReceiptNumber(item.id, item.transactionDate),
        transactionDate: item.transactionDate.toISOString(),
        amountPaid: item.amountPaid.toString(),
        paymentMode: item.paymentMode,
        referenceNo: item.referenceNo,
        remark: item.remark
      }))
    },
    latestTransaction:
      createdTransactionId && createdReceiptNumber
        ? {
            id: createdTransactionId,
            receiptNo: createdReceiptNumber
          }
        : null
  };
}

export async function updateScholarshipModule(studentId: string, rawPayload: unknown, currentUserId?: string | null) {
  const payload = rawPayload as {
    status?: ScholarshipStatus;
    scholarshipId?: string;
    queryText?: string;
    approvedDate?: string;
    creditedAmount?: number | string | null;
    creditDate?: string;
    incomeCertificateOk?: boolean;
    bankVerified?: boolean;
    aadhaarVerified?: boolean;
    casteCertificateOk?: boolean;
  };

  if (!payload.status) {
    throw new Error("Scholarship status is required");
  }

  const hasField = (key: string) => Object.prototype.hasOwnProperty.call(payload, key);

  const updated = await prisma.$transaction(async (tx) => {
    const data: Record<string, unknown> = {
      status: payload.status
    };

    if (hasField("scholarshipId")) data.scholarshipId = payload.scholarshipId?.trim() || null;
    if (hasField("queryText")) data.queryText = payload.queryText?.trim() || null;
    if (hasField("approvedDate")) data.approvedDate = parseDate(payload.approvedDate);
    if (hasField("creditedAmount")) data.creditedAmount = parseAmount(payload.creditedAmount);
    if (hasField("creditDate")) data.creditDate = parseDate(payload.creditDate);

    if (hasField("incomeCertificateOk")) data.incomeCertificateOk = Boolean(payload.incomeCertificateOk);
    if (hasField("bankVerified")) data.bankVerified = Boolean(payload.bankVerified);
    if (hasField("aadhaarVerified")) data.aadhaarVerified = Boolean(payload.aadhaarVerified);
    if (hasField("casteCertificateOk")) data.casteCertificateOk = Boolean(payload.casteCertificateOk);

    const record = await tx.scholarshipRecord.update({
      where: { studentId },
      data: data as any
    });

    return record;
  });

  const feeProfile = await prisma.feeProfile.findUnique({
    where: { studentId }
  });

  if (feeProfile) {
    const finalFees = calculateEffectiveFee({
      collectionMode: feeProfile.collectionMode,
      instituteDecidedFee: Number(feeProfile.instituteDecidedFee ?? feeProfile.finalFees),
      feesIfScholarship: feeProfile.feesIfScholarship ? Number(feeProfile.feesIfScholarship) : null,
      feesIfNoScholarship: feeProfile.feesIfNoScholarship ? Number(feeProfile.feesIfNoScholarship) : null,
      agentCommittedFee: feeProfile.agentCommittedFee ? Number(feeProfile.agentCommittedFee) : null,
      scholarshipApplied: feeProfile.scholarshipApplied,
      scholarshipApproved: updated.status === ScholarshipStatus.APPROVED,
      convertedFromAgent: feeProfile.convertedFromAgent
    });
    const dueAmount = Math.max(finalFees - Number(feeProfile.paidAmount), 0);
    const paymentStatus = derivePaymentStatus(finalFees, Number(feeProfile.paidAmount));

    await prisma.feeProfile.update({
      where: { studentId },
      data: {
        finalFees,
        dueAmount,
        paymentStatus,
        practicalExamEligible: feeProfile.adminOverride || dueAmount <= 0
      }
    });
  }

  await createAuditLog({
    userId: currentUserId,
    studentId,
    module: "SCHOLARSHIP",
    action: "UPDATE_SCHOLARSHIP",
    metadata: {
      status: payload.status,
      scholarshipId: payload.scholarshipId?.trim() || null
    }
  });

  return {
    scholarship: {
      status: updated.status,
      scholarshipId: updated.scholarshipId,
      queryText: updated.queryText,
      approvedDate: updated.approvedDate?.toISOString() || null,
      creditedAmount: updated.creditedAmount?.toString() || null,
      creditDate: updated.creditDate?.toISOString() || null,
      incomeCertificateOk: updated.incomeCertificateOk,
      bankVerified: updated.bankVerified,
      aadhaarVerified: updated.aadhaarVerified,
      casteCertificateOk: updated.casteCertificateOk
    }
  };
}

export async function updatePrnScvtModule(studentId: string, rawPayload: unknown, currentUserId?: string | null) {
  const payload = rawPayload as {
    entRollNumber?: string;
    admissionStatus?: string;
    prnNumber?: string;
    scvtRegistrationNumber?: string;
    uploadDate?: string;
    verificationStatus?: VerificationStatus;
    remark?: string;
  };

  if (!payload.verificationStatus) {
    throw new Error("Verification status is required");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.prnScvtRecord.findUnique({
      where: { studentId }
    });

    const nextEntRollNumber = payload.entRollNumber?.trim() || existing?.entRollNumber || null;
    const nextAdmissionStatus = payload.admissionStatus?.trim() || existing?.admissionStatus || null;
    const nextScvtRegistrationNumber =
      payload.scvtRegistrationNumber?.trim() || existing?.scvtRegistrationNumber || null;
    const nextVerificationStatus = payload.verificationStatus || existing?.verificationStatus || VerificationStatus.PENDING;
    const wantsPrnUpdate = Boolean(payload.prnNumber?.trim());
    const scvtReady =
      Boolean(nextEntRollNumber) &&
      Boolean(nextAdmissionStatus) &&
      Boolean(nextScvtRegistrationNumber) &&
      nextVerificationStatus === VerificationStatus.VERIFIED;

    if (wantsPrnUpdate && !scvtReady) {
      throw new Error("Complete SCVT registration first, then PRN will open for this student");
    }

    const record = await tx.prnScvtRecord.update({
      where: { studentId },
      data: {
        entRollNumber: payload.entRollNumber?.trim() || null,
        admissionStatus: payload.admissionStatus?.trim() || null,
        prnNumber: payload.prnNumber?.trim() || null,
        scvtRegistrationNumber: payload.scvtRegistrationNumber?.trim() || null,
        uploadDate: parseDate(payload.uploadDate),
        verificationStatus: payload.verificationStatus,
        remark: payload.remark?.trim() || null
      }
    });

    return record;
  });

  await createAuditLog({
    userId: currentUserId,
    studentId,
    module: "PRN_SCVT",
    action: "UPDATE_PRN_SCVT",
    metadata: {
      verificationStatus: payload.verificationStatus
    }
  });

  return {
    prnScvt: {
      entRollNumber: updated.entRollNumber,
      admissionStatus: updated.admissionStatus,
      prnNumber: updated.prnNumber,
      scvtRegistrationNumber: updated.scvtRegistrationNumber,
      verificationStatus: updated.verificationStatus,
      uploadDate: updated.uploadDate?.toISOString() || null,
      remark: updated.remark
    }
  };
}

export async function updateExamStatusModule(studentId: string, rawPayload: unknown, currentUserId?: string | null) {
  const payload = rawPayload as {
    examFeePaid?: boolean;
    hallTicketIssuedOn?: string;
    tradePracticalResult?: ExamResultStatus;
    onlineTheoryResult?: ExamResultStatus;
    practicalExamAppearance?: ExamAppearanceStatus;
    practicalAttemptCount?: number | string;
    theoryAttemptCount?: number | string;
    nextPracticalAttemptDate?: string;
    nextTheoryAttemptDate?: string;
    practicalReappearStatus?: ReappearStatus;
    theoryReappearStatus?: ReappearStatus;
    adminOverrideReason?: string;
    resultPublished?: boolean;
    resultDeclaredOn?: string;
    remark?: string;
  };

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      feeProfile: true,
      noDuesClearances: true,
      examStatusRecord: true
    }
  });

  if (!student) {
    throw new Error("Student not found");
  }

  const existingExam = student.examStatusRecord;
  const hasField = (key: string) => Object.prototype.hasOwnProperty.call(payload, key);

  const practicalAttemptCount = hasField("practicalAttemptCount")
    ? normalizeAttemptCount(payload.practicalAttemptCount, "Practical attempt count")
    : normalizeAttemptCount(existingExam?.practicalAttemptCount ?? 0, "Practical attempt count");
  const theoryAttemptCount = hasField("theoryAttemptCount")
    ? normalizeAttemptCount(payload.theoryAttemptCount, "Theory attempt count")
    : normalizeAttemptCount(existingExam?.theoryAttemptCount ?? 0, "Theory attempt count");

  const practicalEligibleReappear = practicalAttemptCount < 4;
  const theoryEligibleReappear = theoryAttemptCount < 4;

  const examFeePaid = hasField("examFeePaid") ? Boolean(payload.examFeePaid) : Boolean(existingExam?.examFeePaid ?? false);
  const hallTicketIssuedOn = hasField("hallTicketIssuedOn")
    ? parseDate(payload.hallTicketIssuedOn)
    : existingExam?.hallTicketIssuedOn || null;

  const resultPublished = hasField("resultPublished") ? Boolean(payload.resultPublished) : Boolean(existingExam?.resultPublished ?? false);
  const resultDeclaredOn = hasField("resultDeclaredOn")
    ? parseDate(payload.resultDeclaredOn)
    : existingExam?.resultDeclaredOn || null;

  const adminOverrideReason = hasField("adminOverrideReason")
    ? payload.adminOverrideReason?.trim() || null
    : existingExam?.adminOverrideReason || null;

  const practicalExamAppearance = hasField("practicalExamAppearance")
    ? payload.practicalExamAppearance || ExamAppearanceStatus.NOT_APPEARED
    : existingExam?.practicalExamAppearance || ExamAppearanceStatus.NOT_APPEARED;

  const remark = hasField("remark") ? payload.remark?.trim() || null : existingExam?.remark || null;

  const noDuesReady =
    student.noDuesClearances.length > 0 &&
    student.noDuesClearances.every((item) => item.isCleared);
  const feeCleared = Number(student.feeProfile?.dueAmount || 0) <= 0;
  const documentsReady = student.documentsStatus === VerificationStatus.VERIFIED;
  const eligibilityReady = student.eligibilityStatus === VerificationStatus.VERIFIED;
  const hallTicketReady = examFeePaid && feeCleared && noDuesReady && documentsReady && eligibilityReady;
  const practicalPermissionReady =
    hallTicketReady && Boolean(student.feeProfile?.practicalExamEligible || student.feeProfile?.adminOverride);

  const tradePracticalResult = hasField("tradePracticalResult")
    ? payload.tradePracticalResult || ExamResultStatus.NOT_DECLARED
    : existingExam?.tradePracticalResult || ExamResultStatus.NOT_DECLARED;
  const onlineTheoryResult = hasField("onlineTheoryResult")
    ? payload.onlineTheoryResult || ExamResultStatus.NOT_DECLARED
    : existingExam?.onlineTheoryResult || ExamResultStatus.NOT_DECLARED;

  const practicalReappearStatus =
    tradePracticalResult === ExamResultStatus.FAIL
      ? practicalEligibleReappear
        ? (hasField("practicalReappearStatus") ? payload.practicalReappearStatus : existingExam?.practicalReappearStatus) || ReappearStatus.PENDING
        : ReappearStatus.NOT_ELIGIBLE
      : ReappearStatus.NOT_REQUIRED;
  const theoryReappearStatus =
    onlineTheoryResult === ExamResultStatus.FAIL
      ? theoryEligibleReappear
        ? (hasField("theoryReappearStatus") ? payload.theoryReappearStatus : existingExam?.theoryReappearStatus) || ReappearStatus.PENDING
        : ReappearStatus.NOT_ELIGIBLE
      : ReappearStatus.NOT_REQUIRED;

  const nextPracticalAttemptDate =
    tradePracticalResult === ExamResultStatus.FAIL && practicalEligibleReappear
      ? hasField("nextPracticalAttemptDate")
        ? parseDate(payload.nextPracticalAttemptDate)
        : existingExam?.nextPracticalAttemptDate || null
      : null;
  const nextTheoryAttemptDate =
    onlineTheoryResult === ExamResultStatus.FAIL && theoryEligibleReappear
      ? hasField("nextTheoryAttemptDate")
        ? parseDate(payload.nextTheoryAttemptDate)
        : existingExam?.nextTheoryAttemptDate || null
      : null;

  if (tradePracticalResult === ExamResultStatus.FAIL && practicalEligibleReappear && !nextPracticalAttemptDate) {
    throw new Error("Next practical attempt date is required when practical exam is failed");
  }

  if (onlineTheoryResult === ExamResultStatus.FAIL && theoryEligibleReappear && !nextTheoryAttemptDate) {
    throw new Error("Next theory attempt date is required when theory exam is failed");
  }

  if ((hallTicketIssuedOn || resultPublished) && (!hallTicketReady || !practicalPermissionReady) && !adminOverrideReason) {
    throw new Error("Admin override reason is required when exam control is forced despite pending eligibility blockers");
  }

  if (resultPublished && !resultDeclaredOn) {
    throw new Error("Result declared date is required when result is published");
  }

  const updated = await prisma.examStatusRecord.update({
    where: { studentId },
    data: {
      examFeePaid,
      hallTicketIssuedOn,
      tradePracticalResult,
      onlineTheoryResult,
      practicalExamAppearance,
      practicalAttemptCount,
      theoryAttemptCount,
      nextPracticalAttemptDate,
      nextTheoryAttemptDate,
      practicalReappearStatus,
      theoryReappearStatus,
      practicalEligibleReappear,
      theoryEligibleReappear,
      adminOverrideReason,
      resultPublished,
      resultDeclaredOn: resultPublished ? resultDeclaredOn : null,
      remark
    }
  });

  await createAuditLog({
    userId: currentUserId,
    studentId,
    module: "EXAM_STATUS",
    action: "UPDATE_EXAM_STATUS",
    metadata: {
      tradePracticalResult,
      onlineTheoryResult,
      examFeePaid,
      hallTicketReady,
      practicalPermissionReady,
      practicalAttemptCount,
      theoryAttemptCount
    }
  });

  return {
    examStatus: {
      examFeePaid: updated.examFeePaid,
      hallTicketIssuedOn: updated.hallTicketIssuedOn?.toISOString() || null,
      tradePracticalResult: updated.tradePracticalResult,
      onlineTheoryResult: updated.onlineTheoryResult,
      practicalExamAppearance: updated.practicalExamAppearance,
      practicalAttemptCount: updated.practicalAttemptCount,
      theoryAttemptCount: updated.theoryAttemptCount,
      nextPracticalAttemptDate: updated.nextPracticalAttemptDate?.toISOString() || null,
      nextTheoryAttemptDate: updated.nextTheoryAttemptDate?.toISOString() || null,
      practicalReappearStatus: updated.practicalReappearStatus,
      theoryReappearStatus: updated.theoryReappearStatus,
      practicalEligibleReappear: updated.practicalEligibleReappear,
      theoryEligibleReappear: updated.theoryEligibleReappear,
      adminOverrideReason: updated.adminOverrideReason,
      resultPublished: updated.resultPublished,
      resultDeclaredOn: updated.resultDeclaredOn?.toISOString() || null,
      remark: updated.remark
    }
  };
}

export async function updateUndertakingModule(studentId: string, rawPayload: unknown, currentUserId?: string | null) {
  const payload = rawPayload as {
    generatedUrl?: string;
    generationStatus?: VerificationStatus;
    generatedOn?: string;
    signedDocumentUrl?: string;
    signedStatus?: VerificationStatus;
    incrementPrintCount?: boolean;
  };

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.undertakingRecord.findUnique({
      where: { studentId }
    });

    const hasField = (key: string) => Object.prototype.hasOwnProperty.call(payload, key);
    const signedDocumentUrlProvided = hasField("signedDocumentUrl");

    const resolvedGeneratedUrl =
      payload.generatedUrl?.trim() ||
      current?.generatedUrl ||
      buildUndertakingPrintUrl(studentId);
    const resolvedSignedUrl = signedDocumentUrlProvided
      ? payload.signedDocumentUrl?.trim() || null
      : current?.signedDocumentUrl || null;
    const generationStatus = resolvedGeneratedUrl ? VerificationStatus.VERIFIED : VerificationStatus.PENDING;
    const signedStatus = signedDocumentUrlProvided
      ? resolvedSignedUrl
        ? current?.signedStatus || VerificationStatus.PENDING
        : VerificationStatus.PENDING
      : current?.signedStatus || VerificationStatus.PENDING;
    const generatedOn =
      parseDate(payload.generatedOn) ||
      current?.generatedOn ||
      (resolvedGeneratedUrl ? new Date() : null);

    const record = await tx.undertakingRecord.update({
      where: { studentId },
      data: {
        templateDocumentId: current?.templateDocumentId || undertakingTemplateDocumentId,
        generatedUrl: resolvedGeneratedUrl,
        generationStatus,
        generatedOn,
        ...(signedDocumentUrlProvided ? { signedDocumentUrl: resolvedSignedUrl, signedStatus } : {}),
        printCount: (current?.printCount || 0) + (payload.incrementPrintCount ? 1 : 0)
      }
    });

    await tx.student.update({
      where: { id: studentId },
      data: {
        undertakingStatus: signedStatus
      }
    });

    return record;
  });

  await refreshStudentDocumentStatus(studentId);

  await createAuditLog({
    userId: currentUserId,
    studentId,
    module: "UNDERTAKING",
    action: "UPDATE_UNDERTAKING",
    metadata: {
      generationStatus: updated.generationStatus,
      signedStatus: updated.signedStatus,
      incrementPrintCount: Boolean(payload.incrementPrintCount)
    }
  });

  return {
    undertaking: {
      verificationCode: updated.verificationCode,
      generatedUrl: updated.generatedUrl,
      generationStatus: updated.generationStatus,
      generatedOn: updated.generatedOn?.toISOString() || null,
      printCount: updated.printCount,
      signedDocumentUrl: updated.signedDocumentUrl,
      signedStatus: updated.signedStatus
    }
  };
}

export async function uploadSignedUndertaking(studentId: string, file: File, currentUserId?: string | null) {
  const student = await prisma.student.findUnique({
    where: { id: studentId }
  });

  if (!student) {
    throw new Error("Student not found");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const signedDocumentHash = createHash("sha256").update(bytes).digest("hex");
  const safeName = `${Date.now()}-${sanitizeFileName(file.name)}`;
  const relativeDir = path.join("uploads", "undertakings", studentId);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, safeName), bytes);

  const fileUrl = `/${relativeDir}/${safeName}`.replace(/\\/g, "/");

  const existingByHash = await prisma.undertakingRecord.findFirst({
    where: {
      signedDocumentHash,
      studentId: {
        not: studentId
      }
    },
    include: {
      student: true
    }
  });

  if (existingByHash) {
    throw new Error(`This signed undertaking already matches student ${existingByHash.student.studentCode}. Upload the correct signed file for this student.`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.undertakingRecord.findUnique({
      where: { studentId }
    });

    const record = await tx.undertakingRecord.update({
      where: { studentId },
      data: {
        templateDocumentId: current?.templateDocumentId || undertakingTemplateDocumentId,
        generatedUrl: current?.generatedUrl || buildUndertakingPrintUrl(studentId),
        generationStatus: current?.generatedUrl ? current.generationStatus : VerificationStatus.VERIFIED,
        generatedOn: current?.generatedOn || new Date(),
        signedDocumentUrl: fileUrl,
        signedDocumentHash,
        signedStatus: VerificationStatus.PENDING
      }
    });

    await tx.student.update({
      where: { id: studentId },
      data: {
        undertakingStatus: VerificationStatus.PENDING
      }
    });

    return record;
  });

  await createAuditLog({
    userId: currentUserId,
    studentId,
    module: "UNDERTAKING",
    action: "UPLOAD_SIGNED_UNDERTAKING",
    metadata: {
      fileUrl,
      originalName: file.name,
      signedDocumentHash,
      reviewStatus: "PENDING_ADMIN_APPROVAL"
    }
  });

  return {
    undertaking: {
      verificationCode: updated.verificationCode,
      generatedUrl: updated.generatedUrl,
      generationStatus: updated.generationStatus,
      generatedOn: updated.generatedOn?.toISOString() || null,
      printCount: updated.printCount,
      signedDocumentUrl: updated.signedDocumentUrl,
      signedStatus: updated.signedStatus
    }
  };
}

export async function reviewUndertaking(
  studentId: string,
  status: "VERIFIED" | "REJECTED" | "INCOMPLETE",
  currentUserId?: string | null
) {
  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.undertakingRecord.findUnique({
      where: { studentId }
    });

    if (!current?.signedDocumentUrl) {
      throw new Error("Signed undertaking has not been uploaded yet");
    }

    const record = await tx.undertakingRecord.update({
      where: { studentId },
      data: {
        signedStatus: status
      }
    });

    await tx.student.update({
      where: { id: studentId },
      data: {
        undertakingStatus: status
      }
    });

    return record;
  });

  await createAuditLog({
    userId: currentUserId,
    studentId,
    module: "UNDERTAKING",
    action: "REVIEW_SIGNED_UNDERTAKING",
    metadata: {
      signedStatus: status
    }
  });

  return {
    undertaking: {
      verificationCode: updated.verificationCode,
      generatedUrl: updated.generatedUrl,
      generationStatus: updated.generationStatus,
      generatedOn: updated.generatedOn?.toISOString() || null,
      printCount: updated.printCount,
      signedDocumentUrl: updated.signedDocumentUrl,
      signedStatus: updated.signedStatus
    }
  };
}
