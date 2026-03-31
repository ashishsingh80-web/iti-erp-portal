import { PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/audit-service";
import { isAccountsDateClosed } from "@/lib/services/accounts-service";

type VendorBillPayload = {
  vendorName?: string;
  materialDescription?: string;
  billDate?: string;
  referenceNo?: string;
  note?: string;
  totalAmount?: string | number;
};

type VendorPaymentPayload = {
  paymentDate?: string;
  amountPaid?: string | number;
  paymentMode?: string;
  referenceNo?: string;
  note?: string;
};

type VendorFilters = {
  vendorName?: string;
  dateFrom?: string;
  dateTo?: string;
};

function toNumber(value: string | number | undefined) {
  return Number(value || 0);
}

function normalizeStatus(totalAmount: number, paidAmount: number) {
  if (paidAmount <= 0) return PaymentStatus.UNPAID;
  if (paidAmount >= totalAmount) return PaymentStatus.PAID;
  return PaymentStatus.PARTIAL;
}

function buildVendorPaymentVoucher(paymentId: string, paymentDate: Date) {
  const year = paymentDate.getFullYear();
  const month = String(paymentDate.getMonth() + 1).padStart(2, "0");
  const day = String(paymentDate.getDate()).padStart(2, "0");
  return `VPM-${year}${month}${day}-${paymentId.slice(-4).toUpperCase()}`;
}

export async function listVendorBills() {
  const bills = await prisma.vendorBill.findMany({
    include: {
      createdBy: true,
      payments: {
        include: {
          createdBy: true
        },
        orderBy: {
          paymentDate: "desc"
        }
      }
    },
    orderBy: {
      billDate: "desc"
    }
  });

  const summary = bills.reduce(
    (acc, bill) => {
      acc.totalBilled += Number(bill.totalAmount);
      acc.totalPaid += Number(bill.paidAmount);
      acc.totalDue += Number(bill.dueAmount);
      return acc;
    },
    { totalBilled: 0, totalPaid: 0, totalDue: 0 }
  );

  return {
    summary: {
      totalBills: String(bills.length),
      totalBilled: summary.totalBilled.toFixed(2),
      totalPaid: summary.totalPaid.toFixed(2),
      totalDue: summary.totalDue.toFixed(2)
    },
    rows: bills.map((bill) => ({
      id: bill.id,
      vendorName: bill.vendorName,
      materialDescription: bill.materialDescription || "",
      billDate: bill.billDate.toISOString(),
      referenceNo: bill.referenceNo || "",
      note: bill.note || "",
      totalAmount: bill.totalAmount.toString(),
      paidAmount: bill.paidAmount.toString(),
      dueAmount: bill.dueAmount.toString(),
      paymentStatus: bill.paymentStatus,
      createdByName: bill.createdBy?.name || "System",
      payments: bill.payments.map((payment) => ({
        id: payment.id,
        voucherNo: buildVendorPaymentVoucher(payment.id, payment.paymentDate),
        paymentDate: payment.paymentDate.toISOString(),
        amountPaid: payment.amountPaid.toString(),
        paymentMode: payment.paymentMode,
        referenceNo: payment.referenceNo || "",
        note: payment.note || "",
        createdByName: payment.createdBy?.name || "System"
      }))
    }))
  };
}

export async function getPurchaseRegister(filters: VendorFilters = {}) {
  const rows = await prisma.vendorBill.findMany({
    where: {
      ...(filters.vendorName ? { vendorName: filters.vendorName } : {}),
      ...((filters.dateFrom || filters.dateTo)
        ? {
            billDate: {
              ...(filters.dateFrom ? { gte: new Date(`${filters.dateFrom}T00:00:00.000Z`) } : {}),
              ...(filters.dateTo ? { lte: new Date(`${filters.dateTo}T23:59:59.999Z`) } : {})
            }
          }
        : {})
    },
    include: {
      createdBy: true
    },
    orderBy: {
      billDate: "desc"
    }
  });

  const summary = rows.reduce(
    (acc, row) => {
      acc.totalBilled += Number(row.totalAmount);
      acc.totalPaid += Number(row.paidAmount);
      acc.totalDue += Number(row.dueAmount);
      return acc;
    },
    { totalBilled: 0, totalPaid: 0, totalDue: 0 }
  );

  return {
    summary: {
      totalBilled: summary.totalBilled.toFixed(2),
      totalPaid: summary.totalPaid.toFixed(2),
      totalDue: summary.totalDue.toFixed(2)
    },
    rows: rows.map((row) => ({
      id: row.id,
      vendorName: row.vendorName,
      materialDescription: row.materialDescription || "",
      billDate: row.billDate.toISOString(),
      referenceNo: row.referenceNo || "",
      totalAmount: row.totalAmount.toString(),
      paidAmount: row.paidAmount.toString(),
      dueAmount: row.dueAmount.toString(),
      paymentStatus: row.paymentStatus,
      createdByName: row.createdBy?.name || "System"
    }))
  };
}

export async function getVendorStatement(vendorName: string, filters: VendorFilters = {}) {
  const trimmedVendorName = vendorName.trim();
  if (!trimmedVendorName) {
    throw new Error("Vendor name is required");
  }

  const bills = await prisma.vendorBill.findMany({
    where: {
      vendorName: trimmedVendorName,
      ...((filters.dateFrom || filters.dateTo)
        ? {
            billDate: {
              ...(filters.dateFrom ? { gte: new Date(`${filters.dateFrom}T00:00:00.000Z`) } : {}),
              ...(filters.dateTo ? { lte: new Date(`${filters.dateTo}T23:59:59.999Z`) } : {})
            }
          }
        : {})
    },
    include: {
      payments: {
        include: {
          createdBy: true
        },
        orderBy: {
          paymentDate: "desc"
        }
      }
    },
    orderBy: {
      billDate: "desc"
    }
  });

  const summary = bills.reduce(
    (acc, bill) => {
      acc.totalBilled += Number(bill.totalAmount);
      acc.totalPaid += Number(bill.paidAmount);
      acc.totalDue += Number(bill.dueAmount);
      return acc;
    },
    { totalBilled: 0, totalPaid: 0, totalDue: 0 }
  );

  return {
    vendorName: trimmedVendorName,
    summary: {
      totalBilled: summary.totalBilled.toFixed(2),
      totalPaid: summary.totalPaid.toFixed(2),
      totalDue: summary.totalDue.toFixed(2)
    },
    bills: bills.map((bill) => ({
      id: bill.id,
      billDate: bill.billDate.toISOString(),
      materialDescription: bill.materialDescription || "",
      referenceNo: bill.referenceNo || "",
      note: bill.note || "",
      totalAmount: bill.totalAmount.toString(),
      paidAmount: bill.paidAmount.toString(),
      dueAmount: bill.dueAmount.toString(),
      paymentStatus: bill.paymentStatus,
      payments: bill.payments.map((payment) => ({
        id: payment.id,
        voucherNo: buildVendorPaymentVoucher(payment.id, payment.paymentDate),
        paymentDate: payment.paymentDate.toISOString(),
        amountPaid: payment.amountPaid.toString(),
        paymentMode: payment.paymentMode,
        referenceNo: payment.referenceNo || "",
        note: payment.note || "",
        createdByName: payment.createdBy?.name || "System"
      }))
    }))
  };
}

export async function createVendorBill(rawPayload: VendorBillPayload, currentUserId?: string | null) {
  const vendorName = rawPayload.vendorName?.trim();
  const totalAmount = toNumber(rawPayload.totalAmount);
  const billDate = rawPayload.billDate ? new Date(rawPayload.billDate) : new Date();

  if (!vendorName) {
    throw new Error("Vendor name is required");
  }
  if (!(totalAmount > 0)) {
    throw new Error("Bill amount must be greater than 0");
  }
  if (Number.isNaN(billDate.getTime())) {
    throw new Error("Bill date is invalid");
  }

  const bill = await prisma.vendorBill.create({
    data: {
      vendorName,
      materialDescription: rawPayload.materialDescription?.trim() || null,
      billDate,
      referenceNo: rawPayload.referenceNo?.trim() || null,
      note: rawPayload.note?.trim() || null,
      totalAmount,
      paidAmount: 0,
      dueAmount: totalAmount,
      paymentStatus: PaymentStatus.UNPAID,
      createdById: currentUserId || null
    }
  });

  await createAuditLog({
    userId: currentUserId,
    module: "ACCOUNTS",
    action: "CREATE_VENDOR_BILL",
    metadata: {
      vendorBillId: bill.id,
      vendorName: bill.vendorName,
      totalAmount: bill.totalAmount.toString()
    }
  });

  return bill.id;
}

export async function updateVendorBill(vendorBillId: string, rawPayload: VendorBillPayload, currentUserId?: string | null) {
  const existing = await prisma.vendorBill.findUnique({
    where: { id: vendorBillId }
  });

  if (!existing) {
    throw new Error("Vendor bill not found");
  }

  const vendorName = rawPayload.vendorName?.trim();
  const totalAmount = toNumber(rawPayload.totalAmount);
  const billDate = rawPayload.billDate ? new Date(rawPayload.billDate) : existing.billDate;

  if (!vendorName) {
    throw new Error("Vendor name is required");
  }
  if (!(totalAmount > 0)) {
    throw new Error("Bill amount must be greater than 0");
  }
  if (Number.isNaN(billDate.getTime())) {
    throw new Error("Bill date is invalid");
  }
  if (totalAmount < Number(existing.paidAmount)) {
    throw new Error("Bill amount cannot be less than already paid amount");
  }

  const dueAmount = totalAmount - Number(existing.paidAmount);
  const updated = await prisma.vendorBill.update({
    where: { id: vendorBillId },
    data: {
      vendorName,
      materialDescription: rawPayload.materialDescription?.trim() || null,
      billDate,
      referenceNo: rawPayload.referenceNo?.trim() || null,
      note: rawPayload.note?.trim() || null,
      totalAmount,
      dueAmount,
      paymentStatus: normalizeStatus(totalAmount, Number(existing.paidAmount))
    }
  });

  await createAuditLog({
    userId: currentUserId,
    module: "ACCOUNTS",
    action: "UPDATE_VENDOR_BILL",
    metadata: {
      vendorBillId: updated.id,
      vendorName: updated.vendorName,
      totalAmount: updated.totalAmount.toString()
    }
  });

  return updated.id;
}

export async function deleteVendorBill(vendorBillId: string, currentUserId?: string | null) {
  const existing = await prisma.vendorBill.findUnique({
    where: { id: vendorBillId },
    include: {
      payments: true
    }
  });

  if (!existing) {
    throw new Error("Vendor bill not found");
  }

  if (existing.payments.length) {
    throw new Error("Vendor bill cannot be deleted after installment payments are added");
  }

  await prisma.vendorBill.delete({
    where: { id: vendorBillId }
  });

  await createAuditLog({
    userId: currentUserId,
    module: "ACCOUNTS",
    action: "DELETE_VENDOR_BILL",
    metadata: {
      vendorBillId,
      vendorName: existing.vendorName
    }
  });
}

export async function addVendorPayment(vendorBillId: string, rawPayload: VendorPaymentPayload, currentUserId?: string | null) {
  const paymentDate = rawPayload.paymentDate ? new Date(rawPayload.paymentDate) : new Date();
  const amountPaid = toNumber(rawPayload.amountPaid);
  const paymentMode = rawPayload.paymentMode?.trim();

  if (!(amountPaid > 0)) {
    throw new Error("Payment amount must be greater than 0");
  }
  if (!paymentMode) {
    throw new Error("Payment mode is required");
  }
  if (Number.isNaN(paymentDate.getTime())) {
    throw new Error("Payment date is invalid");
  }
  if (await isAccountsDateClosed(paymentDate)) {
    throw new Error("Selected payment date is already closed in accounts");
  }

  const bill = await prisma.vendorBill.findUnique({
    where: { id: vendorBillId }
  });

  if (!bill) {
    throw new Error("Vendor bill not found");
  }

  if (amountPaid > Number(bill.dueAmount)) {
    throw new Error("Payment amount cannot exceed vendor due amount");
  }

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const accountEntry = await tx.accountEntry.create({
      data: {
        entryType: "EXPENSE",
        category: "VENDOR_PAYMENT",
        head: "STUDENT_WELFARE",
        subHead: "WORKSHOP_MATERIAL",
        partyName: bill.vendorName,
        amount: amountPaid,
        paymentMode,
        referenceNo: rawPayload.referenceNo?.trim() || null,
        note: rawPayload.note?.trim() || `Vendor payment against bill ${bill.referenceNo || bill.id}`,
        entryDate: paymentDate,
        createdById: currentUserId || null
      }
    });

    const payment = await tx.vendorPayment.create({
      data: {
        vendorBillId: bill.id,
        accountEntryId: accountEntry.id,
        paymentDate,
        amountPaid,
        paymentMode,
        referenceNo: rawPayload.referenceNo?.trim() || null,
        note: rawPayload.note?.trim() || null,
        createdById: currentUserId || null
      }
    });

    const nextPaidAmount = Number(bill.paidAmount) + amountPaid;
    const nextDueAmount = Number(bill.totalAmount) - nextPaidAmount;

    await tx.vendorBill.update({
      where: { id: bill.id },
      data: {
        paidAmount: nextPaidAmount,
        dueAmount: nextDueAmount,
        paymentStatus: normalizeStatus(Number(bill.totalAmount), nextPaidAmount)
      }
    });

    return payment.id;
  });

  await createAuditLog({
    userId: currentUserId,
    module: "ACCOUNTS",
    action: "ADD_VENDOR_PAYMENT",
    metadata: {
      vendorBillId,
      amountPaid: amountPaid.toString(),
      paymentMode
    }
  });

  return result;
}
