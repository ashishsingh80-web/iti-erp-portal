import { AttendancePersonType, AttendanceStatus, StudentLifecycleStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/audit-service";

export type AttendanceScope = "students" | "staff";

export async function listAttendanceRows(scope: AttendanceScope, recordDate: string, search = "") {
  const date = new Date(`${recordDate}T00:00:00.000Z`);
  const searchText = search.trim();

  if (scope === "staff") {
    const rows = await prisma.hrStaff.findMany({
      where: {
        isActive: true,
        isGovtRecordOnly: false,
        ...(searchText
          ? {
              OR: [
                { fullName: { startsWith: searchText, mode: "insensitive" } },
                { employeeCode: { startsWith: searchText, mode: "insensitive" } },
                { mobile: { startsWith: searchText, mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: {
        attendanceRecords: {
          where: { recordDate: date }
        }
      },
      orderBy: { fullName: "asc" },
      take: 100
    });

    return rows.map((row) => ({
      id: row.id,
      code: row.employeeCode,
      fullName: row.fullName,
      photoUrl: row.photoUrl,
      type: "STAFF" as const,
      secondary: [row.designation, row.department].filter(Boolean).join(" • "),
      attendance: row.attendanceRecords[0]
        ? {
            id: row.attendanceRecords[0].id,
            status: row.attendanceRecords[0].status,
            checkInAt: row.attendanceRecords[0].checkInAt?.toISOString() || "",
            checkOutAt: row.attendanceRecords[0].checkOutAt?.toISOString() || "",
            note: row.attendanceRecords[0].note || ""
          }
        : null
    }));
  }

  const rows = await prisma.student.findMany({
    where: {
      deletedAt: null,
      lifecycleStage: {
        in: [StudentLifecycleStage.ACTIVE, StudentLifecycleStage.PROMOTED]
      },
      ...(searchText
        ? {
            OR: [
              { fullName: { startsWith: searchText, mode: "insensitive" } },
              { studentCode: { startsWith: searchText, mode: "insensitive" } },
              { mobile: { startsWith: searchText, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: {
      institute: true,
      trade: true,
      documents: {
        where: { documentType: "STUDENT_PHOTO", deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1
      },
      attendanceRecords: {
        where: { recordDate: date }
      }
    },
    orderBy: { fullName: "asc" },
    take: 150
  });

  return rows.map((row) => ({
    id: row.id,
    code: row.studentCode,
    fullName: row.fullName,
    photoUrl: row.documents[0]?.fileUrl || null,
    type: "STUDENT" as const,
    secondary: [row.trade.name, row.session, row.yearLabel].filter(Boolean).join(" • "),
    attendance: row.attendanceRecords[0]
      ? {
          id: row.attendanceRecords[0].id,
          status: row.attendanceRecords[0].status,
          checkInAt: row.attendanceRecords[0].checkInAt?.toISOString() || "",
          checkOutAt: row.attendanceRecords[0].checkOutAt?.toISOString() || "",
          note: row.attendanceRecords[0].note || ""
        }
      : null
  }));
}

export async function upsertAttendanceRecord(input: {
  personType: AttendancePersonType;
  targetId: string;
  recordDate: string;
  status: AttendanceStatus;
  action?: "CHECK_IN" | "CHECK_OUT" | "STATUS_ONLY";
  note?: string;
  userId?: string | null;
}) {
  const date = new Date(`${input.recordDate}T00:00:00.000Z`);
  const now = new Date();
  const where =
    input.personType === AttendancePersonType.STUDENT
      ? { studentId_recordDate: { studentId: input.targetId, recordDate: date } }
      : { staffId_recordDate: { staffId: input.targetId, recordDate: date } };

  const existing = await prisma.attendanceRecord.findUnique({ where });

  const record = existing
    ? await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          note: input.note || null,
          ...(input.action === "CHECK_IN" ? { checkInAt: existing.checkInAt || now } : {}),
          ...(input.action === "CHECK_OUT" ? { checkOutAt: now } : {})
        }
      })
    : await prisma.attendanceRecord.create({
        data: {
          personType: input.personType,
          studentId: input.personType === AttendancePersonType.STUDENT ? input.targetId : null,
          staffId: input.personType === AttendancePersonType.STAFF ? input.targetId : null,
          recordDate: date,
          status: input.status,
          note: input.note || null,
          checkInAt: input.action === "CHECK_IN" ? now : null,
          checkOutAt: input.action === "CHECK_OUT" ? now : null,
          createdById: input.userId || null
        }
      });

  await createAuditLog({
    userId: input.userId,
    studentId: input.personType === AttendancePersonType.STUDENT ? input.targetId : null,
    module: "ATTENDANCE",
    action: input.action || "STATUS_ONLY",
    metadata: {
      personType: input.personType,
      targetId: input.targetId,
      recordDate: input.recordDate,
      status: input.status
    }
  });

  return record;
}

export async function findAttendanceTargetByCode(code: string, scope: AttendanceScope) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  if (scope === "staff") {
    return prisma.hrStaff.findFirst({
      where: {
        employeeCode: normalized,
        isActive: true,
        isGovtRecordOnly: false
      },
      select: { id: true, fullName: true, employeeCode: true, photoUrl: true }
    });
  }

  return prisma.student.findFirst({
    where: {
      studentCode: normalized,
      deletedAt: null,
      lifecycleStage: {
        in: [StudentLifecycleStage.ACTIVE, StudentLifecycleStage.PROMOTED]
      }
    },
    include: {
      documents: {
        where: { documentType: "STUDENT_PHOTO", deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });
}
