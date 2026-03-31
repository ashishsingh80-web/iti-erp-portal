import { NoDuesDepartment, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPendingIssueCountsByStudentIds } from "@/lib/services/inventory-service";
import { getPendingLibraryIssueCountsByStudentIds } from "@/lib/services/library-service";

export const noDuesDepartmentOptions = [
  { label: "Accounts", value: "ACCOUNTS" },
  { label: "Workshop", value: "WORKSHOP" },
  { label: "Store", value: "STORE" },
  { label: "Library", value: "LIBRARY" },
  { label: "Documents", value: "DOCUMENTS" },
  { label: "ID Card", value: "ID_CARD" }
] as const;

export async function listNoDuesRows(search = "") {
  const where: Prisma.StudentWhereInput = {
    deletedAt: null,
    ...(search.trim()
      ? {
          OR: [
            { fullName: { contains: search.trim(), mode: "insensitive" } },
            { studentCode: { contains: search.trim(), mode: "insensitive" } },
            { mobile: { contains: search.trim() } }
          ]
        }
      : {})
  };

  const students = await prisma.student.findMany({
    where,
    include: {
      institute: true,
      trade: true,
      feeProfile: true,
      noDuesClearances: {
        include: {
          approvedBy: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  const pendingIssueCounts = await getPendingIssueCountsByStudentIds(students.map((student) => student.id));
  const pendingLibraryCounts = await getPendingLibraryIssueCountsByStudentIds(students.map((student) => student.id));

  return students.map((student) => {
    const issueCounts = pendingIssueCounts.get(student.id) || { STORE: 0, WORKSHOP: 0 };
    const pendingLibraryCount = pendingLibraryCounts.get(student.id) || 0;
    const clearanceMap = new Map(
      student.noDuesClearances.map((item) => [
        item.department,
        {
          id: item.id,
          isCleared: item.isCleared,
          clearanceDate: item.clearanceDate ? item.clearanceDate.toISOString().slice(0, 10) : "",
          remark: item.remark || "",
          approvedBy: item.approvedBy?.name || ""
        }
      ])
    );

    const computedClearances = noDuesDepartmentOptions.map((item) => {
      const saved = clearanceMap.get(item.value as NoDuesDepartment);
      const hasPendingStore = item.value === "STORE" && issueCounts.STORE > 0;
      const hasPendingWorkshop = item.value === "WORKSHOP" && issueCounts.WORKSHOP > 0;
      const hasPendingLibrary = item.value === "LIBRARY" && pendingLibraryCount > 0;
      const blockedByInventory = hasPendingStore || hasPendingWorkshop || hasPendingLibrary;
      const blockedCount = Number(hasPendingStore ? issueCounts.STORE : hasPendingWorkshop ? issueCounts.WORKSHOP : pendingLibraryCount);
      const blockedLabel = hasPendingStore ? "item" : hasPendingWorkshop ? "item" : "book";

      return {
        department: item.value,
        label: item.label,
        isCleared: blockedByInventory ? false : saved?.isCleared || false,
        clearanceDate: blockedByInventory ? "" : saved?.clearanceDate || "",
        remark: blockedByInventory
          ? `${blockedCount} pending ${blockedLabel} return${blockedCount > 1 ? "s" : ""}`
          : saved?.remark || "",
        approvedBy: blockedByInventory ? "" : saved?.approvedBy || "",
        blockedByInventory
      };
    });

    const pendingDepartments = computedClearances.filter((item) => !item.isCleared).length;

    return {
      id: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      instituteName: student.institute.name,
      tradeName: student.trade.name,
      session: student.session,
      yearLabel: student.yearLabel,
      dueAmount: student.feeProfile?.dueAmount?.toString() || "0",
      paymentStatus: student.feeProfile?.paymentStatus || "UNPAID",
      pendingDepartments,
      readyForRelease: pendingDepartments === 0,
      clearances: computedClearances
    };
  });
}

export async function saveNoDuesClearances(
  studentId: string,
  clearances: Array<{ department: string; isCleared: boolean; clearanceDate?: string; remark?: string }>,
  approvedById?: string | null
) {
  return prisma.$transaction(async (tx) => {
    for (const item of clearances) {
      await tx.studentNoDuesClearance.upsert({
        where: {
          studentId_department: {
            studentId,
            department: item.department as NoDuesDepartment
          }
        },
        create: {
          studentId,
          department: item.department as NoDuesDepartment,
          isCleared: item.isCleared,
          clearanceDate: item.isCleared
            ? item.clearanceDate
              ? new Date(`${item.clearanceDate}T00:00:00.000Z`)
              : new Date()
            : null,
          remark: item.remark?.trim() || null,
          approvedById: item.isCleared ? approvedById || null : null
        },
        update: {
          isCleared: item.isCleared,
          clearanceDate: item.isCleared
            ? item.clearanceDate
              ? new Date(`${item.clearanceDate}T00:00:00.000Z`)
              : new Date()
            : null,
          remark: item.remark?.trim() || null,
          approvedById: item.isCleared ? approvedById || null : null
        }
      });
    }

    return tx.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        studentCode: true,
        fullName: true
      }
    });
  });
}
