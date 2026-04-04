import { StudentArchiveCategory, StudentLifecycleStage, StudentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { tradeUnitCatalog } from "@/lib/constants";
import { countStudentsOnUnitForAdmission } from "@/lib/services/admission-service";
import { createAuditLog } from "@/lib/services/audit-service";

export type AdmissionLifecycleAction = "CANCELED" | "DROPPED" | "TRANSFERRED";

function buildLifecycleUpdate(action: AdmissionLifecycleAction) {
  if (action === "CANCELED") {
    return {
      status: StudentStatus.REJECTED,
      lifecycleStage: StudentLifecycleStage.ACTIVE,
      archiveCategory: null,
      archivedAt: null
    };
  }

  return {
    status: StudentStatus.REJECTED,
    lifecycleStage: StudentLifecycleStage.ARCHIVED,
    archiveCategory: StudentArchiveCategory.INACTIVE_LEFT,
    archivedAt: new Date()
  };
}

export async function updateAdmissionLifecycle(studentId: string, action: AdmissionLifecycleAction, note: string, currentUserId?: string | null) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      studentCode: true,
      fullName: true,
      admissionStatusLabel: true,
      internalNotes: true
    }
  });

  if (!student) throw new Error("Student not found");

  const lifecycle = buildLifecycleUpdate(action);
  const trimmedNote = note.trim();
  const nextInternalNotes = [student.internalNotes, trimmedNote ? `[${action}] ${trimmedNote}` : ""]
    .filter(Boolean)
    .join("\n");

  const updated = await prisma.student.update({
    where: { id: studentId },
    data: {
      admissionStatusLabel: action,
      status: lifecycle.status,
      lifecycleStage: lifecycle.lifecycleStage,
      archiveCategory: lifecycle.archiveCategory,
      archivedAt: lifecycle.archivedAt,
      archiveNote: trimmedNote || null,
      internalNotes: nextInternalNotes || null
    }
  });

  await createAuditLog({
    userId: currentUserId || null,
    studentId,
    module: "ADMISSIONS",
    action: `MARK_${action}`,
    metadata: {
      previousAdmissionStatus: student.admissionStatusLabel,
      nextAdmissionStatus: action,
      note: trimmedNote || null,
      studentCode: student.studentCode
    }
  });

  return updated;
}

export async function assignAdmissionUnit(studentId: string, unitNumber: number, currentUserId?: string | null) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      institute: true,
      trade: true
    }
  });

  if (!student) throw new Error("Student not found");

  const tradeValue = `${student.institute.instituteCode}::${student.trade.tradeCode}`;
  const tradeConfig = tradeUnitCatalog[tradeValue];
  if (!tradeConfig) throw new Error("Trade unit configuration not found");

  if (unitNumber < 1 || unitNumber > tradeConfig.unitCount) {
    throw new Error(`Valid unit must be between 1 and ${tradeConfig.unitCount}`);
  }

  const existingCount = await countStudentsOnUnitForAdmission({
    instituteId: student.instituteId,
    tradeId: student.tradeId,
    tradeKey: tradeValue,
    unitNumber,
    session: student.session,
    yearLabel: student.yearLabel,
    excludeStudentId: student.id
  });

  if (existingCount >= tradeConfig.seatsPerUnit) {
    throw new Error(`Unit ${unitNumber} is already full`);
  }

  const updated = await prisma.student.update({
    where: { id: studentId },
    data: {
      unitNumber
    }
  });

  await createAuditLog({
    userId: currentUserId || null,
    studentId,
    module: "ADMISSIONS",
    action: "ASSIGN_UNIT",
    metadata: {
      previousUnitNumber: student.unitNumber,
      nextUnitNumber: unitNumber,
      studentCode: student.studentCode
    }
  });

  return updated;
}
