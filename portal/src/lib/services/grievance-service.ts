import { GrievancePriority, GrievanceStatus, GrievanceTargetType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/audit-service";

export const grievancePriorityOptions = [
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Critical", value: "CRITICAL" }
] as const;

export const grievanceStatusOptions = [
  { label: "Open", value: "OPEN" },
  { label: "In Review", value: "IN_REVIEW" },
  { label: "Action In Progress", value: "ACTION_IN_PROGRESS" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Closed", value: "CLOSED" }
] as const;

export const grievanceTargetOptions = [
  { label: "General", value: "GENERAL" },
  { label: "Student", value: "STUDENT" },
  { label: "Staff", value: "STAFF" }
] as const;

function buildGrievanceNumber(date = new Date()) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `GRV-${yy}${mm}${dd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function listGrievanceDeskData(search = "", status = "") {
  const [rows, students, staff] = await Promise.all([
    prisma.grievanceCase.findMany({
      where: {
        ...(status ? { status: status as GrievanceStatus } : {}),
        ...(search.trim()
          ? {
              OR: [
                { grievanceNo: { startsWith: search.trim(), mode: "insensitive" } },
                { title: { startsWith: search.trim(), mode: "insensitive" } },
                { category: { startsWith: search.trim(), mode: "insensitive" } },
                { reportedByName: { startsWith: search.trim(), mode: "insensitive" } },
                { assignedToName: { startsWith: search.trim(), mode: "insensitive" } },
                { student: { fullName: { startsWith: search.trim(), mode: "insensitive" } } },
                { staff: { fullName: { startsWith: search.trim(), mode: "insensitive" } } }
              ]
            }
          : {})
      },
      include: {
        student: true,
        staff: true,
        createdBy: true
      },
      orderBy: [{ createdAt: "desc" }],
      take: 100
    }),
    prisma.student.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    prisma.hrStaff.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 50
    })
  ]);

  return {
    grievances: rows.map((row) => ({
      id: row.id,
      grievanceNo: row.grievanceNo,
      targetType: row.targetType,
      studentId: row.studentId || "",
      studentName: row.student?.fullName || "",
      studentCode: row.student?.studentCode || "",
      staffId: row.staffId || "",
      staffName: row.staff?.fullName || "",
      staffCode: row.staff?.employeeCode || "",
      category: row.category,
      title: row.title,
      description: row.description,
      priority: row.priority,
      status: row.status,
      reportedByName: row.reportedByName || "",
      reportedByMobile: row.reportedByMobile || "",
      assignedToName: row.assignedToName || "",
      actionTaken: row.actionTaken || "",
      resolutionNote: row.resolutionNote || "",
      resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString().slice(0, 10) : "",
      createdByName: row.createdBy?.name || "System",
      createdAt: row.createdAt.toISOString().slice(0, 10)
    })),
    students: students.map((row) => ({
      id: row.id,
      label: `${row.studentCode} - ${row.fullName}`
    })),
    staff: staff.map((row) => ({
      id: row.id,
      label: `${row.employeeCode} - ${row.fullName}`
    }))
  };
}

export async function createGrievanceCase(
  payload: {
    targetType: string;
    studentId?: string;
    staffId?: string;
    category: string;
    title: string;
    description: string;
    priority: string;
    reportedByName?: string;
    reportedByMobile?: string;
    assignedToName?: string;
  },
  userId?: string | null
) {
  if (!payload.category.trim() || !payload.title.trim() || !payload.description.trim()) {
    throw new Error("Category, title, and description are required");
  }

  if (payload.targetType === "STUDENT" && !payload.studentId) {
    throw new Error("Student is required for student grievance");
  }
  if (payload.targetType === "STAFF" && !payload.staffId) {
    throw new Error("Staff member is required for staff grievance");
  }

  const grievance = await prisma.grievanceCase.create({
    data: {
      grievanceNo: buildGrievanceNumber(),
      targetType: payload.targetType as GrievanceTargetType,
      studentId: payload.targetType === "STUDENT" ? payload.studentId || null : null,
      staffId: payload.targetType === "STAFF" ? payload.staffId || null : null,
      category: payload.category.trim(),
      title: payload.title.trim(),
      description: payload.description.trim(),
      priority: (payload.priority || "MEDIUM") as GrievancePriority,
      reportedByName: payload.reportedByName?.trim() || null,
      reportedByMobile: payload.reportedByMobile?.trim() || null,
      assignedToName: payload.assignedToName?.trim() || null,
      createdById: userId || null
    }
  });

  await createAuditLog({
    userId,
    studentId: grievance.studentId,
    module: "grievance",
    action: "CREATE_CASE",
    metadata: {
      grievanceNo: grievance.grievanceNo,
      priority: grievance.priority,
      status: grievance.status
    }
  });

  return grievance;
}

export async function updateGrievanceCase(
  grievanceId: string,
  payload: {
    status?: string;
    priority?: string;
    assignedToName?: string;
    actionTaken?: string;
    resolutionNote?: string;
  },
  userId?: string | null
) {
  const existing = await prisma.grievanceCase.findUnique({ where: { id: grievanceId } });
  if (!existing) throw new Error("Grievance case not found");

  const nextStatus = (payload.status || existing.status) as GrievanceStatus;
  const updated = await prisma.grievanceCase.update({
    where: { id: grievanceId },
    data: {
      status: nextStatus,
      priority: (payload.priority || existing.priority) as GrievancePriority,
      assignedToName: payload.assignedToName?.trim() || existing.assignedToName,
      actionTaken: payload.actionTaken?.trim() || existing.actionTaken,
      resolutionNote: payload.resolutionNote?.trim() || existing.resolutionNote,
      resolvedAt: nextStatus === "RESOLVED" || nextStatus === "CLOSED" ? existing.resolvedAt || new Date() : null
    }
  });

  await createAuditLog({
    userId,
    studentId: updated.studentId,
    module: "grievance",
    action: "UPDATE_CASE",
    metadata: {
      grievanceNo: updated.grievanceNo,
      status: updated.status,
      priority: updated.priority
    }
  });

  return updated;
}
