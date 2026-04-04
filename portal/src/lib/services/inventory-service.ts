import { InventoryDepartment, InventoryIssueStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/audit-service";

export const inventoryDepartmentOptions = [
  { label: "Store", value: "STORE" },
  { label: "Workshop", value: "WORKSHOP" }
] as const;

export async function listInventoryDeskData(search = "", department = "") {
  const itemWhere: Prisma.InventoryItemWhereInput = {
    ...(department ? { department: department as InventoryDepartment } : {}),
    ...(search.trim()
      ? {
          OR: [
            { itemCode: { startsWith: search.trim(), mode: "insensitive" } },
            { itemName: { startsWith: search.trim(), mode: "insensitive" } },
            { storageLocation: { startsWith: search.trim(), mode: "insensitive" } }
          ]
        }
      : {})
  };

  const studentWhere: Prisma.StudentWhereInput = {
    deletedAt: null,
    ...(search.trim()
      ? {
          OR: [
            { fullName: { startsWith: search.trim(), mode: "insensitive" } },
            { studentCode: { startsWith: search.trim(), mode: "insensitive" } },
            { mobile: { startsWith: search.trim() } }
          ]
        }
      : {})
  };

  const [items, issues, students] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: itemWhere,
      include: {
        issues: {
          where: {
            status: {
              in: [InventoryIssueStatus.ISSUED, InventoryIssueStatus.PARTIAL_RETURNED]
            }
          }
        }
      },
      orderBy: [{ department: "asc" }, { itemName: "asc" }],
      take: 100
    }),
    prisma.inventoryIssue.findMany({
      where: {
        ...(department ? { item: { department: department as InventoryDepartment } } : {}),
        ...(search.trim()
          ? {
              OR: [
                { student: { fullName: { startsWith: search.trim(), mode: "insensitive" } } },
                { student: { studentCode: { startsWith: search.trim(), mode: "insensitive" } } },
                { item: { itemCode: { startsWith: search.trim(), mode: "insensitive" } } },
                { item: { itemName: { startsWith: search.trim(), mode: "insensitive" } } }
              ]
            }
          : {})
      },
      include: {
        item: true,
        student: {
          include: {
            institute: true,
            trade: true
          }
        }
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 150
    }),
    prisma.student.findMany({
      where: studentWhere,
      include: {
        institute: true,
        trade: true
      },
      orderBy: { createdAt: "desc" },
      take: 50
    })
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      itemCode: item.itemCode,
      itemName: item.itemName,
      department: item.department,
      unitLabel: item.unitLabel,
      currentStock: item.currentStock.toString(),
      reorderLevel: item.reorderLevel.toString(),
      storageLocation: item.storageLocation || "",
      note: item.note || "",
      isActive: item.isActive,
      openIssueCount: item.issues.length,
      stockWarning:
        item.currentStock.lte(item.reorderLevel) && item.reorderLevel.gt(0)
          ? "LOW_STOCK"
          : item.currentStock.lte(0)
            ? "OUT_OF_STOCK"
            : "OK"
    })),
    issues: issues.map((issue) => ({
      id: issue.id,
      itemId: issue.itemId,
      itemCode: issue.item.itemCode,
      itemName: issue.item.itemName,
      department: issue.item.department,
      studentId: issue.studentId,
      studentCode: issue.student.studentCode,
      studentName: issue.student.fullName,
      instituteName: issue.student.institute.name,
      tradeName: issue.student.trade.name,
      quantityIssued: issue.quantityIssued.toString(),
      quantityReturned: issue.quantityReturned.toString(),
      quantityPending: issue.quantityIssued.minus(issue.quantityReturned).toString(),
      issueDate: issue.issueDate.toISOString().slice(0, 10),
      expectedReturnDate: issue.expectedReturnDate ? issue.expectedReturnDate.toISOString().slice(0, 10) : "",
      lastReturnDate: issue.lastReturnDate ? issue.lastReturnDate.toISOString().slice(0, 10) : "",
      status: issue.status,
      remark: issue.remark || ""
    })),
    students: students.map((student) => ({
      id: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      instituteName: student.institute.name,
      tradeName: student.trade.name,
      session: student.session,
      yearLabel: student.yearLabel
    }))
  };
}

export async function createInventoryItem(
  payload: {
    itemCode: string;
    itemName: string;
    department: string;
    unitLabel?: string;
    currentStock?: string;
    reorderLevel?: string;
    storageLocation?: string;
    note?: string;
    isActive?: boolean;
  },
  userId?: string | null
) {
  if (!payload.itemCode.trim() || !payload.itemName.trim() || !payload.department) {
    throw new Error("Item code, item name, and department are required");
  }

  const item = await prisma.inventoryItem.create({
    data: {
      itemCode: payload.itemCode.trim().toUpperCase(),
      itemName: payload.itemName.trim(),
      department: payload.department as InventoryDepartment,
      unitLabel: payload.unitLabel?.trim() || "pcs",
      currentStock: new Prisma.Decimal(payload.currentStock || "0"),
      reorderLevel: new Prisma.Decimal(payload.reorderLevel || "0"),
      storageLocation: payload.storageLocation?.trim() || null,
      note: payload.note?.trim() || null,
      isActive: payload.isActive ?? true
    }
  });

  await createAuditLog({
    userId,
    module: "inventory",
    action: "CREATE_ITEM",
    metadata: {
      itemCode: item.itemCode,
      department: item.department
    }
  });

  return item;
}

export async function issueInventoryItem(
  payload: {
    itemId: string;
    studentId: string;
    quantityIssued: string;
    issueDate: string;
    expectedReturnDate?: string;
    remark?: string;
  },
  userId?: string | null
) {
  if (!payload.itemId || !payload.studentId || !payload.issueDate || !payload.quantityIssued) {
    throw new Error("Item, student, quantity, and issue date are required");
  }

  const quantityIssued = new Prisma.Decimal(payload.quantityIssued);
  if (quantityIssued.lte(0)) {
    throw new Error("Issued quantity must be greater than zero");
  }

  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: payload.itemId } });
    if (!item) throw new Error("Inventory item not found");
    if (!item.isActive) throw new Error("Inactive items cannot be issued");
    if (item.currentStock.lt(quantityIssued)) throw new Error("Not enough stock available for this issue");

    const issue = await tx.inventoryIssue.create({
      data: {
        itemId: payload.itemId,
        studentId: payload.studentId,
        quantityIssued,
        issueDate: new Date(`${payload.issueDate}T00:00:00.000Z`),
        expectedReturnDate: payload.expectedReturnDate ? new Date(`${payload.expectedReturnDate}T00:00:00.000Z`) : null,
        remark: payload.remark?.trim() || null,
        issuedById: userId || null
      },
      include: {
        item: true,
        student: true
      }
    });

    await tx.inventoryItem.update({
      where: { id: payload.itemId },
      data: {
        currentStock: item.currentStock.minus(quantityIssued)
      }
    });

    await createAuditLog({
      userId,
      studentId: payload.studentId,
      module: "inventory",
      action: "ISSUE_ITEM",
      metadata: {
        itemCode: issue.item.itemCode,
        quantityIssued: issue.quantityIssued.toString()
      }
    });

    return issue;
  });
}

export async function returnInventoryIssue(
  payload: {
    issueId: string;
    quantityReturned: string;
    returnDate: string;
    remark?: string;
  },
  userId?: string | null
) {
  if (!payload.issueId || !payload.quantityReturned || !payload.returnDate) {
    throw new Error("Issue, return quantity, and return date are required");
  }

  const quantityReturned = new Prisma.Decimal(payload.quantityReturned);
  if (quantityReturned.lte(0)) {
    throw new Error("Returned quantity must be greater than zero");
  }

  return prisma.$transaction(async (tx) => {
    const issue = await tx.inventoryIssue.findUnique({
      where: { id: payload.issueId },
      include: {
        item: true
      }
    });

    if (!issue) throw new Error("Inventory issue not found");

    const pendingQuantity = issue.quantityIssued.minus(issue.quantityReturned);
    if (quantityReturned.gt(pendingQuantity)) {
      throw new Error("Return quantity cannot exceed pending quantity");
    }

    const nextReturned = issue.quantityReturned.plus(quantityReturned);
    const nextPending = issue.quantityIssued.minus(nextReturned);

    const updatedIssue = await tx.inventoryIssue.update({
      where: { id: payload.issueId },
      data: {
        quantityReturned: nextReturned,
        lastReturnDate: new Date(`${payload.returnDate}T00:00:00.000Z`),
        returnedById: userId || null,
        remark: payload.remark?.trim() || issue.remark || null,
        status: nextPending.lte(0) ? InventoryIssueStatus.RETURNED : InventoryIssueStatus.PARTIAL_RETURNED
      }
    });

    await tx.inventoryItem.update({
      where: { id: issue.itemId },
      data: {
        currentStock: issue.item.currentStock.plus(quantityReturned)
      }
    });

    await createAuditLog({
      userId,
      studentId: issue.studentId,
      module: "inventory",
      action: "RETURN_ITEM",
      metadata: {
        itemCode: issue.item.itemCode,
        quantityReturned: quantityReturned.toString(),
        status: updatedIssue.status
      }
    });

    return updatedIssue;
  });
}

export async function getPendingIssueCountsByStudentIds(studentIds: string[]) {
  if (!studentIds.length) return new Map<string, { STORE: number; WORKSHOP: number }>();

  const rows = await prisma.inventoryIssue.findMany({
    where: {
      studentId: { in: studentIds },
      status: {
        in: [InventoryIssueStatus.ISSUED, InventoryIssueStatus.PARTIAL_RETURNED]
      }
    },
    include: {
      item: true
    }
  });

  const counts = new Map<string, { STORE: number; WORKSHOP: number }>();
  for (const row of rows) {
    const current = counts.get(row.studentId) || { STORE: 0, WORKSHOP: 0 };
    if (row.item.department === InventoryDepartment.STORE) {
      current.STORE += 1;
    } else {
      current.WORKSHOP += 1;
    }
    counts.set(row.studentId, current);
  }

  return counts;
}
