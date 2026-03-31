import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/audit-service";
import { addFeePaymentInTx } from "@/lib/services/profile-operations-service";
import { FeeCollectionScope, FeePayerType } from "@prisma/client";

function buildAgentCollectionVoucher(collectionDate: Date, index: number) {
  const year = collectionDate.getFullYear();
  const month = String(collectionDate.getMonth() + 1).padStart(2, "0");
  const day = String(collectionDate.getDate()).padStart(2, "0");
  return `AGC-${year}${month}${day}-${String(index).padStart(3, "0")}`;
}

export async function createAgentCollection(
  rawPayload: {
    agentCode?: string;
    totalAmount?: number | string;
    paymentMode?: string;
    referenceNo?: string;
    remark?: string;
    collectionDate?: string;
    allocations?: Array<{ studentId?: string; amountAllocated?: number | string }>;
  },
  currentUserId?: string | null
) {
  const totalAmount = Number(rawPayload.totalAmount || 0);
  if (!rawPayload.agentCode?.trim()) throw new Error("Agent code is required");
  if (!rawPayload.paymentMode?.trim()) throw new Error("Payment mode is required");
  if (!(totalAmount > 0)) throw new Error("Total amount must be greater than 0");

  const agent = await prisma.agent.findUnique({
    where: { agentCode: rawPayload.agentCode.trim() }
  });

  if (!agent) throw new Error("Agent not found");

  const allocations = Array.isArray(rawPayload.allocations)
    ? rawPayload.allocations
        .filter((item) => item.studentId && Number(item.amountAllocated || 0) > 0)
        .map((item) => ({
          studentId: String(item.studentId),
          amountAllocated: Number(item.amountAllocated)
        }))
    : [];

  const allocatedAmount = allocations.reduce((sum, item) => sum + item.amountAllocated, 0);
  if (allocatedAmount > totalAmount) {
    throw new Error("Allocated amount cannot exceed total collection amount");
  }

  const collectionDate = rawPayload.collectionDate ? new Date(rawPayload.collectionDate) : new Date();
  const collectionId = await prisma.$transaction(async (tx) => {
    const collection = await tx.agentCollection.create({
      data: {
        agentId: agent.id,
        collectionDate,
        totalAmount,
        allocatedAmount,
        unallocatedAmount: totalAmount - allocatedAmount,
        paymentMode: rawPayload.paymentMode.trim(),
        referenceNo: rawPayload.referenceNo?.trim() || null,
        remark: rawPayload.remark?.trim() || null
      }
    });

    for (const allocation of allocations) {
      await tx.agentCollectionAllocation.create({
        data: {
          agentCollectionId: collection.id,
          studentId: allocation.studentId,
          amountAllocated: allocation.amountAllocated
        }
      });
      await addFeePaymentInTx(tx, {
        studentId: allocation.studentId,
        amountPaid: allocation.amountAllocated,
        payerType: FeePayerType.AGENT,
        collectionScope: allocations.length > 1 ? FeeCollectionScope.BULK : FeeCollectionScope.STUDENT_WISE,
        paymentMode: rawPayload.paymentMode.trim(),
        transactionDate: collectionDate,
        agentId: agent.id,
        allocationGroup: collection.id,
        referenceNo: rawPayload.referenceNo?.trim() || null,
        remark: rawPayload.remark?.trim() || null,
        createdById: currentUserId || null
      });
    }
    return collection.id;
  });

  await createAuditLog({
    userId: currentUserId,
    module: "FEES",
    action: "CREATE_AGENT_COLLECTION",
    metadata: {
      agentCode: rawPayload.agentCode.trim(),
      collectionId,
      totalAmount,
      allocatedAmount
    }
  });

  return collectionId;
}

export async function listAgentCollections() {
  const rows = await prisma.agentCollection.findMany({
    include: {
      agent: true,
      allocations: {
        include: {
          student: true
        }
      }
    },
    orderBy: {
      collectionDate: "desc"
    },
    take: 50
  });

  return rows.map((item, index) => ({
    id: item.id,
    voucherNo: buildAgentCollectionVoucher(item.collectionDate, rows.length - index),
    agentCode: item.agent.agentCode,
    agentName: item.agent.name,
    collectionDate: item.collectionDate.toISOString(),
    totalAmount: item.totalAmount.toString(),
    allocatedAmount: item.allocatedAmount.toString(),
    unallocatedAmount: item.unallocatedAmount.toString(),
    paymentMode: item.paymentMode,
    referenceNo: item.referenceNo,
    remark: item.remark,
    allocations: item.allocations.map((allocation) => ({
      id: allocation.id,
      studentId: allocation.studentId,
      studentCode: allocation.student.studentCode,
      studentName: allocation.student.fullName,
      amountAllocated: allocation.amountAllocated.toString()
    }))
  }));
}

export async function allocateAgentCollectionBalance(
  collectionId: string,
  rawPayload: {
    allocations?: Array<{ studentId?: string; amountAllocated?: number | string }>;
  },
  currentUserId?: string | null
) {
  const allocations = Array.isArray(rawPayload.allocations)
    ? rawPayload.allocations
        .filter((item) => item.studentId && Number(item.amountAllocated || 0) > 0)
        .map((item) => ({
          studentId: String(item.studentId),
          amountAllocated: Number(item.amountAllocated)
        }))
    : [];

  if (!allocations.length) {
    throw new Error("Select at least one student allocation");
  }

  const allocationAmount = allocations.reduce((sum, item) => sum + item.amountAllocated, 0);
  const auditAgentCode = await prisma.$transaction(async (tx) => {
    const collection = await tx.agentCollection.findUnique({
      where: { id: collectionId },
      include: { agent: true }
    });
    if (!collection) {
      throw new Error("Agent collection not found");
    }

    const reservation = await tx.agentCollection.updateMany({
      where: {
        id: collection.id,
        unallocatedAmount: {
          gte: allocationAmount
        }
      },
      data: {
        allocatedAmount: {
          increment: allocationAmount
        },
        unallocatedAmount: {
          decrement: allocationAmount
        }
      }
    });
    if (reservation.count === 0) {
      throw new Error("Allocation amount exceeds unallocated balance");
    }

    for (const allocation of allocations) {
      await tx.agentCollectionAllocation.create({
        data: {
          agentCollectionId: collection.id,
          studentId: allocation.studentId,
          amountAllocated: allocation.amountAllocated
        }
      });
      await addFeePaymentInTx(tx, {
        studentId: allocation.studentId,
        amountPaid: allocation.amountAllocated,
        payerType: FeePayerType.AGENT,
        collectionScope: allocations.length > 1 ? FeeCollectionScope.BULK : FeeCollectionScope.STUDENT_WISE,
        paymentMode: collection.paymentMode,
        transactionDate: collection.collectionDate,
        agentId: collection.agentId,
        allocationGroup: collection.id,
        referenceNo: collection.referenceNo || null,
        remark: collection.remark || null,
        createdById: currentUserId || null
      });
    }

    return collection.agent.agentCode;
  });

  await createAuditLog({
    userId: currentUserId,
    module: "FEES",
    action: "REALLOCATE_AGENT_COLLECTION",
    metadata: {
      collectionId,
      agentCode: auditAgentCode,
      allocationAmount
    }
  });

  return collectionId;
}

export async function getAgentOutstandingLedger() {
  const agents = await prisma.agent.findMany({
    include: {
      students: {
        where: {
          deletedAt: null,
          feeProfile: {
            collectionMode: "AGENT",
            convertedFromAgent: false
          }
        },
        include: {
          feeProfile: true
        }
      },
      collections: {
        orderBy: {
          collectionDate: "desc"
        },
        take: 25
      },
      feeTransactions: {
        where: {
          payerType: "AGENT"
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });

  return agents.map((agent) => {
    const totalStudents = agent.students.length;
    const committedAmount = agent.students.reduce((sum, student) => sum + Number(student.feeProfile?.finalFees || 0), 0);
    const paidAgainstStudents = agent.students.reduce((sum, student) => sum + Number(student.feeProfile?.paidAmount || 0), 0);
    const outstandingAmount = agent.students.reduce((sum, student) => sum + Number(student.feeProfile?.dueAmount || 0), 0);
    const totalCollections = agent.collections.reduce((sum, row) => sum + Number(row.totalAmount), 0);
    const unallocatedBalance = agent.collections.reduce((sum, row) => sum + Number(row.unallocatedAmount), 0);

    return {
      agentCode: agent.agentCode,
      agentName: agent.name,
      totalStudents,
      committedAmount: committedAmount.toFixed(2),
      paidAgainstStudents: paidAgainstStudents.toFixed(2),
      outstandingAmount: outstandingAmount.toFixed(2),
      totalCollections: totalCollections.toFixed(2),
      unallocatedBalance: unallocatedBalance.toFixed(2),
      studentRows: agent.students
        .filter((student) => Number(student.feeProfile?.dueAmount || 0) > 0)
        .sort((left, right) => Number(right.feeProfile?.dueAmount || 0) - Number(left.feeProfile?.dueAmount || 0))
        .slice(0, 10)
        .map((student) => ({
          studentId: student.id,
          studentCode: student.studentCode,
          fullName: student.fullName,
          session: student.session,
          yearLabel: student.yearLabel,
          finalFees: student.feeProfile?.finalFees.toString() || "0",
          paidAmount: student.feeProfile?.paidAmount.toString() || "0",
          dueAmount: student.feeProfile?.dueAmount.toString() || "0"
        }))
    };
  });
}
