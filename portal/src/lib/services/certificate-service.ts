import { CertificateType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const prismaAny = prisma as any;

export const certificateTypeOptions = [
  { label: "Bonafide Certificate", value: "BONAFIDE" },
  { label: "Character Certificate", value: "CHARACTER" },
  { label: "No Dues Certificate", value: "NO_DUES" },
  { label: "Practical Permission Slip", value: "PRACTICAL_PERMISSION" },
  { label: "Hall Ticket", value: "HALL_TICKET" }
] as const;

function certificatePrefix(type: CertificateType) {
  switch (type) {
    case CertificateType.BONAFIDE:
      return "BON";
    case CertificateType.CHARACTER:
      return "CHR";
    case CertificateType.NO_DUES:
      return "NDC";
    case CertificateType.PRACTICAL_PERMISSION:
      return "PPS";
    case CertificateType.HALL_TICKET:
      return "HLT";
  }
}

async function buildCertificateNumber(type: CertificateType) {
  const now = new Date();
  const dayStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const start = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const end = new Date(`${now.toISOString().slice(0, 10)}T23:59:59.999Z`);
  const count = await prisma.certificatePrintLog.count({
    where: {
      certificateType: type,
      issueDate: {
        gte: start,
        lte: end
      }
    }
  });

  return `${certificatePrefix(type)}-${dayStamp}-${String(count + 1).padStart(4, "0")}`;
}

export async function issueCertificate(studentId: string, type: CertificateType, issuedById?: string | null, note?: string | null) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      institute: true,
      trade: true,
      feeProfile: true,
      examStatusRecord: true,
      noDuesClearances: true
    }
  });

  if (!student) {
    throw new Error("Student not found");
  }

  const noDuesReady = student.noDuesClearances.length > 0 && student.noDuesClearances.every((item) => item.isCleared);
  const hasFeeDue = Number(student.feeProfile?.dueAmount || 0) > 0;
  const hallTicketReady =
    Boolean(student.examStatusRecord?.examFeePaid) &&
    !hasFeeDue &&
    noDuesReady &&
    student.documentsStatus === "VERIFIED" &&
    student.eligibilityStatus === "VERIFIED";
  const practicalPermissionReady =
    hallTicketReady && Boolean(student.feeProfile?.practicalExamEligible || student.feeProfile?.adminOverride);

  if ((type === CertificateType.BONAFIDE || type === CertificateType.CHARACTER) && hasFeeDue) {
    throw new Error("Bonafide and character certificates can be issued only when the student has no fee due");
  }

  if (type === CertificateType.NO_DUES && !noDuesReady) {
    throw new Error("No dues certificate can be issued only after all department clearances are completed");
  }

  if (
    type === CertificateType.PRACTICAL_PERMISSION &&
    !practicalPermissionReady
  ) {
    throw new Error("Practical permission can be issued only when practical eligibility or admin override is active");
  }

  if (type === CertificateType.HALL_TICKET && !hallTicketReady && !student.examStatusRecord?.adminOverrideReason) {
    throw new Error("Hall ticket can be issued only when exam fee, no dues, documents, and eligibility are clear, unless admin override reason exists");
  }

  const certificateNumber = await buildCertificateNumber(type);
  const log = await prismaAny.certificatePrintLog.create({
    data: {
      studentId,
      certificateType: type,
      certificateNumber,
      lastPrintedAt: new Date(),
      note: note?.trim() || null,
      issuedById: issuedById || null
    }
  });

  return {
    logId: log.id,
    certificateNumber: log.certificateNumber
  };
}

export async function listRecentCertificateLogs() {
  const rows = await prismaAny.certificatePrintLog.findMany({
    include: {
      student: {
        include: {
          institute: true,
          trade: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return rows.map((item: any) => ({
    id: item.id,
    certificateNumber: item.certificateNumber,
    verificationCode: item.verificationCode,
    printCount: item.printCount,
    lastPrintedAt: item.lastPrintedAt?.toISOString() || "",
    certificateType: item.certificateType,
    issueDate: item.issueDate.toISOString(),
    studentId: item.studentId,
    studentCode: item.student.studentCode,
    studentName: item.student.fullName,
    instituteName: item.student.institute.name,
    tradeName: item.student.trade.name
  }));
}

export async function getCertificatePrintData(logId: string) {
  return prismaAny.certificatePrintLog.findUnique({
    where: { id: logId },
    include: {
      issuedBy: true,
      student: {
        include: {
          institute: true,
          trade: true,
          parents: true,
          feeProfile: true,
          scholarshipRecord: true,
          prnScvtRecord: true,
          examStatusRecord: true,
          noDuesClearances: {
            include: {
              approvedBy: true
            }
          }
        }
      }
    }
  });
}

export async function getCertificateVerificationData(code: string) {
  const row = await prismaAny.certificatePrintLog.findFirst({
    where: {
      verificationCode: code.trim()
    },
    include: {
      student: {
        include: {
          institute: true,
          trade: true
        }
      }
    }
  });

  if (!row) return null;

  return {
    id: row.id,
    certificateNumber: row.certificateNumber,
    verificationCode: row.verificationCode,
    certificateType: row.certificateType,
    issueDate: row.issueDate.toISOString(),
    printCount: row.printCount,
    studentCode: row.student.studentCode,
    studentName: row.student.fullName,
    instituteName: row.student.institute.name,
    tradeName: row.student.trade.name
  };
}

export async function markCertificatePrinted(logId: string) {
  return prismaAny.certificatePrintLog.update({
    where: { id: logId },
    data: {
      printCount: {
        increment: 1
      },
      lastPrintedAt: new Date()
    }
  });
}
