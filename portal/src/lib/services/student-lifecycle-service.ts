import { PaymentStatus, ScholarshipStatus, StudentArchiveCategory, StudentLifecycleStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/audit-service";

function nextTwoYearSession(session: string) {
  const match = session.match(/^(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error("Session format is invalid");
  }

  const start = Number(match[1]) + 1;
  const end = Number(match[2]) + 1;
  return `${String(start).padStart(2, "0")}-${String(end).padStart(2, "0")}`;
}

export async function listPromotionCandidates() {
  const rows = await prisma.student.findMany({
    where: {
      deletedAt: null,
      lifecycleStage: StudentLifecycleStage.ACTIVE,
      yearLabel: "1st",
      trade: {
        isActive: true,
        name: {
          not: "Dress-Making"
        }
      }
    },
    include: {
      institute: true,
      trade: true
    },
    orderBy: [{ session: "asc" }, { fullName: "asc" }]
  });

  return rows.map((row) => ({
    id: row.id,
    studentCode: row.studentCode,
    fullName: row.fullName,
    instituteName: row.institute.name,
    tradeName: row.trade.name,
    currentSession: row.session,
    nextSession: nextTwoYearSession(row.session),
    currentYear: row.yearLabel
  }));
}

export async function promoteStudentToSecondYear(studentId: string, currentUserId?: string | null) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { trade: true }
  });

  if (!student || student.deletedAt) throw new Error("Student not found");
  if (student.yearLabel !== "1st") throw new Error("Only 1st year students can be promoted");
  if (student.trade.name === "Dress-Making") throw new Error("1-year trade students cannot be promoted to 2nd year");

  const updated = await prisma.student.update({
    where: { id: studentId },
    data: {
      yearLabel: "2nd",
      session: nextTwoYearSession(student.session),
      lifecycleStage: StudentLifecycleStage.PROMOTED,
      promotedAt: new Date()
    }
  });

  await createAuditLog({
    userId: currentUserId || undefined,
    module: "PROMOTE",
    action: "PROMOTE_STUDENT",
    studentId: updated.id,
    metadata: {
      fromYear: "1st",
      toYear: "2nd",
      session: updated.session
    }
  });

  return updated;
}

export async function listAlumniCandidates() {
  const rows = await prisma.student.findMany({
    where: {
      deletedAt: null,
      yearLabel: "2nd",
      lifecycleStage: {
        in: [StudentLifecycleStage.ACTIVE, StudentLifecycleStage.PROMOTED]
      }
    },
    include: {
      institute: true,
      trade: true
    },
    orderBy: [{ session: "asc" }, { fullName: "asc" }]
  });

  return rows.map((row) => ({
    id: row.id,
    studentCode: row.studentCode,
    fullName: row.fullName,
    instituteName: row.institute.name,
    tradeName: row.trade.name,
    session: row.session,
    yearLabel: row.yearLabel,
    status: row.status
  }));
}

export async function sendStudentToAlumni(studentId: string, currentUserId?: string | null) {
  const student = await prisma.student.findUnique({
    where: { id: studentId }
  });

  if (!student || student.deletedAt) throw new Error("Student not found");
  if (student.yearLabel !== "2nd") throw new Error("Only 2nd year students can be moved to alumni");

  const updated = await prisma.student.update({
    where: { id: studentId },
    data: {
      lifecycleStage: StudentLifecycleStage.ALUMNI,
      alumniAt: new Date(),
      status: "COMPLETED"
    }
  });

  await createAuditLog({
    userId: currentUserId || undefined,
    module: "ALUMNI",
    action: "SEND_TO_ALUMNI",
    studentId: updated.id
  });

  return updated;
}

export async function listArchiveCases() {
  const rows = await prisma.student.findMany({
    where: {
      deletedAt: null,
      lifecycleStage: {
        not: StudentLifecycleStage.ALUMNI
      }
    },
    include: {
      institute: true,
      trade: true,
      feeProfile: true,
      scholarshipRecord: true
    },
    orderBy: [{ updatedAt: "desc" }]
  });

  return rows.map((row) => {
    const dueAmount = Number(row.feeProfile?.dueAmount || 0);
    const isScholarshipCase =
      row.scholarshipRecord?.status &&
      row.scholarshipRecord.status !== ScholarshipStatus.NOT_APPLIED;
    const legalPriority = isScholarshipCase && dueAmount > 0;

    return {
      id: row.id,
      studentCode: row.studentCode,
      fullName: row.fullName,
      instituteName: row.institute.name,
      tradeName: row.trade.name,
      session: row.session,
      yearLabel: row.yearLabel,
      archiveCategory: row.archiveCategory,
      archiveNote: row.archiveNote,
      lifecycleStage: row.lifecycleStage,
      feeDueAmount: dueAmount.toFixed(2),
      scholarshipStatus: row.scholarshipRecord?.status || "NOT_APPLIED",
      paymentStatus: row.feeProfile?.paymentStatus || PaymentStatus.UNPAID,
      legalPriority
    };
  });
}

export async function archiveStudentCase(
  studentId: string,
  category: StudentArchiveCategory,
  note: string,
  currentUserId?: string | null
) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.deletedAt) throw new Error("Student not found");

  const updated = await prisma.student.update({
    where: { id: studentId },
    data: {
      lifecycleStage: StudentLifecycleStage.ARCHIVED,
      archivedAt: new Date(),
      archiveCategory: category,
      archiveNote: note || null
    }
  });

  await createAuditLog({
    userId: currentUserId || undefined,
    module: "STUDENT_ARCHIVE",
    action: "ARCHIVE_STUDENT_CASE",
    studentId: updated.id,
    metadata: { category, note }
  });

  return updated;
}
