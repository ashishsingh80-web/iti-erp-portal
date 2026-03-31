import { AccountEntryType, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/audit-service";

type AccountEntryPayload = {
  entryType?: string;
  category?: string;
  head?: string;
  subHead?: string;
  partyName?: string;
  amount?: number | string;
  paymentMode?: string;
  referenceNo?: string;
  note?: string;
  entryDate?: string;
};

type AccountFilters = {
  entryType?: string;
  dateFrom?: string;
  dateTo?: string;
  month?: string;
};

type FinanceReportPeriod = "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";

type AccountListRow = {
  id: string;
  voucherNo: string;
  entryType: string;
  category: string;
  head: string | null;
  subHead: string | null;
  partyName: string | null;
  amount: string;
  paymentMode: string;
  referenceNo: string | null;
  note: string | null;
  entryDate: string;
  createdByName: string;
};

function getDateFilter(filters: AccountFilters) {
  if (filters.month) {
    const start = new Date(`${filters.month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    return {
      gte: start,
      lt: end
    };
  }

  return {
    ...(filters.dateFrom ? { gte: new Date(`${filters.dateFrom}T00:00:00.000Z`) } : {}),
    ...(filters.dateTo ? { lte: new Date(`${filters.dateTo}T23:59:59.999Z`) } : {})
  };
}

type PaymentModeTotals = Record<string, string>;
type HeadSummaryRow = { head: string; entries: string; total: string };
type MonthlyTrendRow = { month: string; income: string; expense: string; bankDeposit: string; netBalance: string };
type PartyContributionRow = { partyName: string; totalIncome: string; totalExpense: string; netBalance: string };

function normalizeDateOnly(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function derivePaymentStatusForRepair(finalFees: number, paidAmount: number) {
  if (paidAmount >= finalFees && finalFees > 0) return PaymentStatus.PAID;
  if (paidAmount > 0 && paidAmount < finalFees) return PaymentStatus.PARTIAL;
  return PaymentStatus.UNPAID;
}

export function buildFeeReceiptNumber(transactionId: string, transactionDate: Date) {
  const year = transactionDate.getFullYear();
  const month = String(transactionDate.getMonth() + 1).padStart(2, "0");
  const day = String(transactionDate.getDate()).padStart(2, "0");
  return `RCPT-${year}${month}${day}-${transactionId.slice(-4).toUpperCase()}`;
}

function buildAccountVoucher(entryType: AccountEntryType, entryDate: Date, index: number) {
  const year = entryDate.getFullYear();
  const month = String(entryDate.getMonth() + 1).padStart(2, "0");
  const day = String(entryDate.getDate()).padStart(2, "0");
  const prefix =
    entryType === AccountEntryType.OPENING_BALANCE
      ? "OPN"
      : entryType === AccountEntryType.EXPENSE
        ? "EXP"
        : entryType === AccountEntryType.BANK_DEPOSIT
          ? "BNK"
          : "INC";
  return `${prefix}-${year}${month}${day}-${String(index).padStart(3, "0")}`;
}

function normalizeEntryType(entryType?: string) {
  if (entryType === "OPENING_BALANCE") return AccountEntryType.OPENING_BALANCE;
  if (entryType === "INCOME") return AccountEntryType.INCOME;
  if (entryType === "BANK_DEPOSIT") return AccountEntryType.BANK_DEPOSIT;
  return AccountEntryType.EXPENSE;
}

function validateAccountPayload(rawPayload: AccountEntryPayload) {
  if (!rawPayload.entryType || !["OPENING_BALANCE", "EXPENSE", "INCOME", "BANK_DEPOSIT"].includes(rawPayload.entryType)) {
    throw new Error("Entry type is required");
  }

  const isOpeningBalance = rawPayload.entryType === "OPENING_BALANCE";
  const isBankDeposit = rawPayload.entryType === "BANK_DEPOSIT";

  if (!isBankDeposit && !isOpeningBalance && !rawPayload.category?.trim()) {
    throw new Error("Category is required");
  }

  if (!isBankDeposit && !isOpeningBalance && !rawPayload.head?.trim()) {
    throw new Error("Head is required");
  }

  if (!isBankDeposit && !isOpeningBalance && !rawPayload.subHead?.trim()) {
    throw new Error("Sub head is required");
  }

  const amount = Number(rawPayload.amount || 0);
  if (!(amount > 0)) {
    throw new Error("Amount must be greater than 0");
  }

  if (!rawPayload.paymentMode?.trim()) {
    throw new Error("Payment mode is required");
  }

  return {
    entryType: normalizeEntryType(rawPayload.entryType),
    category: isOpeningBalance ? "OPENING_BALANCE" : isBankDeposit ? "BANK_DEPOSIT" : rawPayload.category!.trim(),
    head: isOpeningBalance ? "OPENING_CASH" : isBankDeposit ? null : rawPayload.head!.trim(),
    subHead: isOpeningBalance ? "DAILY_OPENING_BALANCE" : isBankDeposit ? null : rawPayload.subHead!.trim(),
    partyName: rawPayload.partyName?.trim() || null,
    amount,
    paymentMode: rawPayload.paymentMode.trim(),
    referenceNo: rawPayload.referenceNo?.trim() || null,
    note: rawPayload.note?.trim() || null,
    entryDate: rawPayload.entryDate ? new Date(rawPayload.entryDate) : new Date()
  };
}

export async function createAccountEntry(
  rawPayload: AccountEntryPayload,
  currentUserId?: string | null
) {
  const payload = validateAccountPayload(rawPayload);
  const normalizedDate = normalizeDateOnly(payload.entryDate);
  const closure = await prisma.accountDayClosure.findUnique({
    where: {
      closedDate: normalizedDate
    }
  });

  if (closure) {
    throw new Error("Selected date is already closed in accounts");
  }

  const entry = await prisma.accountEntry.create({
    data: {
      ...payload,
      createdById: currentUserId || null
    }
  });

  await createAuditLog({
    userId: currentUserId,
    module: "ACCOUNTS",
    action: "CREATE_ACCOUNT_ENTRY",
    metadata: {
      entryId: entry.id,
      entryType: entry.entryType,
      category: entry.category,
      amount: payload.amount
    }
  });

  return entry.id;
}

export async function createFeeReceiptAccountEntry(
  tx: Prisma.TransactionClient,
  input: {
    feeTransactionId: string;
    studentId: string;
    studentCode: string;
    fullName: string;
    amount: number;
    paymentMode: string;
    transactionDate: Date;
    referenceNo?: string | null;
    remark?: string | null;
    createdById?: string | null;
  }
) {
  const existing = await tx.accountEntry.findUnique({
    where: { feeTransactionId: input.feeTransactionId }
  });

  if (existing) {
    return existing.id;
  }

  const row = await tx.accountEntry.create({
    data: {
      entryType: AccountEntryType.INCOME,
      category: "FEE_COLLECTION",
      head: "FEE_COLLECTION",
      subHead: "STUDENT_FEE",
      partyName: `${input.studentCode} • ${input.fullName}`,
      studentId: input.studentId,
      feeTransactionId: input.feeTransactionId,
      amount: input.amount,
      paymentMode: input.paymentMode,
      referenceNo: input.referenceNo || null,
      note: input.remark || "Auto-posted from fee collection",
      entryDate: input.transactionDate,
      createdById: input.createdById || null
    }
  });

  return row.id;
}

export async function updateAccountEntry(entryId: string, rawPayload: AccountEntryPayload, currentUserId?: string | null) {
  const existing = await prisma.accountEntry.findUnique({
    where: { id: entryId },
    select: { id: true, feeTransactionId: true }
  });
  if (!existing) {
    throw new Error("Account entry not found");
  }
  if (existing.feeTransactionId) {
    throw new Error("Fee-linked account entries are system-managed and cannot be edited manually");
  }

  const payload = validateAccountPayload(rawPayload);
  const normalizedDate = normalizeDateOnly(payload.entryDate);
  const closure = await prisma.accountDayClosure.findUnique({
    where: {
      closedDate: normalizedDate
    }
  });

  if (closure) {
    throw new Error("Selected date is already closed in accounts");
  }
  const entry = await prisma.accountEntry.update({
    where: { id: entryId },
    data: payload
  });

  await createAuditLog({
    userId: currentUserId,
    module: "ACCOUNTS",
    action: "UPDATE_ACCOUNT_ENTRY",
    metadata: {
      entryId: entry.id,
      entryType: entry.entryType,
      category: entry.category,
      amount: payload.amount
    }
  });

  return entry.id;
}

export async function deleteAccountEntry(entryId: string, currentUserId?: string | null) {
  const existing = await prisma.accountEntry.findUnique({
    where: { id: entryId }
  });

  if (!existing) {
    throw new Error("Account entry not found");
  }
  if (existing.feeTransactionId) {
    throw new Error("Fee-linked account entries are system-managed and cannot be deleted manually");
  }

  const closure = await prisma.accountDayClosure.findUnique({
    where: {
      closedDate: normalizeDateOnly(existing.entryDate)
    }
  });

  if (closure) {
    throw new Error("Selected date is already closed in accounts");
  }

  const deleted = await prisma.accountEntry.delete({
    where: { id: entryId }
  });

  await createAuditLog({
    userId: currentUserId,
    module: "ACCOUNTS",
    action: "DELETE_ACCOUNT_ENTRY",
    metadata: {
      entryId: deleted.id,
      entryType: deleted.entryType,
      category: deleted.category,
      amount: deleted.amount.toString()
    }
  });
}

export async function isAccountsDateClosed(dateValue: Date) {
  const closure = await prisma.accountDayClosure.findUnique({
    where: {
      closedDate: normalizeDateOnly(dateValue)
    }
  });

  return Boolean(closure);
}

export async function closeAccountsDay(
  rawPayload: {
    closedDate?: string;
    note?: string;
  },
  currentUserId?: string | null
) {
  const closedDate = rawPayload.closedDate ? normalizeDateOnly(new Date(rawPayload.closedDate)) : normalizeDateOnly(new Date());
  if (Number.isNaN(closedDate.getTime())) {
    throw new Error("Closure date is invalid");
  }

  const existing = await prisma.accountDayClosure.findUnique({
    where: {
      closedDate
    }
  });

  if (existing) {
    throw new Error("This date is already closed");
  }

  const { summary } = await listAccountEntries({
    dateFrom: closedDate.toISOString().slice(0, 10),
    dateTo: closedDate.toISOString().slice(0, 10)
  });

  const closure = await prisma.accountDayClosure.create({
    data: {
      closedDate,
      openingBalance: Number(summary.todayOpeningBalance || 0),
      closingBalance: Number(summary.todayClosingBalance || 0),
      note: rawPayload.note?.trim() || null,
      createdById: currentUserId || null
    }
  });

  await createAuditLog({
    userId: currentUserId,
    module: "ACCOUNTS",
    action: "CLOSE_DAY",
    metadata: {
      closedDate: closedDate.toISOString(),
      closingBalance: summary.todayClosingBalance
    }
  });

  return closure.id;
}

export async function reopenAccountsDay(
  rawPayload: {
    closedDate?: string;
  },
  currentUserId?: string | null
) {
  const closedDate = rawPayload.closedDate ? normalizeDateOnly(new Date(rawPayload.closedDate)) : normalizeDateOnly(new Date());
  if (Number.isNaN(closedDate.getTime())) {
    throw new Error("Closure date is invalid");
  }

  const existing = await prisma.accountDayClosure.findUnique({
    where: {
      closedDate
    }
  });

  if (!existing) {
    throw new Error("This date is not closed");
  }

  await prisma.accountDayClosure.delete({
    where: {
      closedDate
    }
  });

  await createAuditLog({
    userId: currentUserId,
    module: "ACCOUNTS",
    action: "REOPEN_DAY",
    metadata: {
      closedDate: closedDate.toISOString()
    }
  });
}

export async function getDayClosingSummary(dateInput: string) {
  const targetDate = normalizeDateOnly(new Date(dateInput));
  if (Number.isNaN(targetDate.getTime())) {
    throw new Error("Summary date is invalid");
  }

  const dateKey = targetDate.toISOString().slice(0, 10);
  const { summary, cashbookRows, bankbookRows } = await listAccountEntries({
    dateFrom: dateKey,
    dateTo: dateKey
  });

  return {
    date: dateKey,
    summary,
    cashbookRows,
    bankbookRows
  };
}

export async function repairFeeLedgerConsistency(
  currentUserId?: string | null,
  options?: { dryRun?: boolean }
) {
  const dryRun = Boolean(options?.dryRun);

  const [transactions, profiles] = await Promise.all([
    prisma.feeTransaction.findMany({
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            fullName: true
          }
        }
      }
    }),
    prisma.feeProfile.findMany({
      select: {
        studentId: true,
        finalFees: true,
        paidAmount: true,
        dueAmount: true,
        adminOverride: true
      }
    })
  ]);

  const txIds = transactions.map((item) => item.id);
  const linkedEntries = txIds.length
    ? await prisma.accountEntry.findMany({
        where: {
          feeTransactionId: {
            in: txIds
          }
        },
        select: {
          id: true,
          feeTransactionId: true,
          studentId: true,
          amount: true,
          entryType: true,
          category: true,
          head: true,
          subHead: true
        }
      })
    : [];

  const entriesByTxId = new Map<string, typeof linkedEntries>();
  for (const row of linkedEntries) {
    const txId = row.feeTransactionId || "";
    if (!txId) continue;
    const current = entriesByTxId.get(txId) || [];
    current.push(row);
    entriesByTxId.set(txId, current);
  }

  const txSumByStudent = new Map<string, number>();
  for (const row of transactions) {
    txSumByStudent.set(row.studentId, (txSumByStudent.get(row.studentId) || 0) + Number(row.amountPaid || 0));
  }

  const actions: string[] = [];
  const blocked: string[] = [];

  if (!dryRun) {
    await prisma.$transaction(async (tx) => {
      for (const row of transactions) {
        const matches = entriesByTxId.get(row.id) || [];
        if (!matches.length) {
          await createFeeReceiptAccountEntry(tx, {
            feeTransactionId: row.id,
            studentId: row.studentId,
            studentCode: row.student.studentCode,
            fullName: row.student.fullName,
            amount: Number(row.amountPaid || 0),
            paymentMode: row.paymentMode,
            transactionDate: row.transactionDate,
            referenceNo: row.referenceNo || null,
            remark: row.remark || null,
            createdById: currentUserId || null
          });
          actions.push(`created-ledger:${row.id}`);
          continue;
        }

        if (matches.length > 1) {
          blocked.push(`duplicate-ledger:${row.id}`);
          continue;
        }

        const linked = matches[0];
        const expectedAmount = Number(row.amountPaid || 0);
        const currentAmount = Number(linked.amount || 0);
        const shapeInvalid =
          linked.entryType !== "INCOME" ||
          linked.category !== "FEE_COLLECTION" ||
          linked.head !== "FEE_COLLECTION" ||
          linked.subHead !== "STUDENT_FEE" ||
          Math.abs(currentAmount - expectedAmount) > 0.01 ||
          (linked.studentId && linked.studentId !== row.studentId);
        if (shapeInvalid) {
          await tx.accountEntry.update({
            where: { id: linked.id },
            data: {
              entryType: AccountEntryType.INCOME,
              category: "FEE_COLLECTION",
              head: "FEE_COLLECTION",
              subHead: "STUDENT_FEE",
              studentId: row.studentId,
              amount: expectedAmount,
              paymentMode: row.paymentMode,
              referenceNo: row.referenceNo || null,
              note: row.remark || "Auto-posted from fee collection",
              entryDate: row.transactionDate
            }
          });
          actions.push(`repaired-ledger:${row.id}`);
        }
      }

      for (const profile of profiles) {
        const txTotal = txSumByStudent.get(profile.studentId) || 0;
        const finalFees = Number(profile.finalFees || 0);
        const dueAmount = Math.max(finalFees - txTotal, 0);
        const paymentStatus = derivePaymentStatusForRepair(finalFees, txTotal);
        const practicalExamEligible = Boolean(profile.adminOverride) || dueAmount <= 0;
        const paidAmountCurrent = Number(profile.paidAmount || 0);
        const dueAmountCurrent = Number(profile.dueAmount || 0);

        if (Math.abs(paidAmountCurrent - txTotal) > 0.01 || Math.abs(dueAmountCurrent - dueAmount) > 0.01) {
          await tx.feeProfile.update({
            where: { studentId: profile.studentId },
            data: {
              paidAmount: txTotal,
              dueAmount,
              paymentStatus,
              practicalExamEligible
            }
          });
          actions.push(`resynced-profile:${profile.studentId}`);
        }
      }
    });
  } else {
    for (const row of transactions) {
      const matches = entriesByTxId.get(row.id) || [];
      if (!matches.length) actions.push(`would-create-ledger:${row.id}`);
      else if (matches.length > 1) blocked.push(`duplicate-ledger:${row.id}`);
      else {
        const linked = matches[0];
        const expectedAmount = Number(row.amountPaid || 0);
        const currentAmount = Number(linked.amount || 0);
        const shapeInvalid =
          linked.entryType !== "INCOME" ||
          linked.category !== "FEE_COLLECTION" ||
          linked.head !== "FEE_COLLECTION" ||
          linked.subHead !== "STUDENT_FEE" ||
          Math.abs(currentAmount - expectedAmount) > 0.01 ||
          (linked.studentId && linked.studentId !== row.studentId);
        if (shapeInvalid) actions.push(`would-repair-ledger:${row.id}`);
      }
    }
    for (const profile of profiles) {
      const txTotal = txSumByStudent.get(profile.studentId) || 0;
      const finalFees = Number(profile.finalFees || 0);
      const dueAmount = Math.max(finalFees - txTotal, 0);
      if (Math.abs(Number(profile.paidAmount || 0) - txTotal) > 0.01 || Math.abs(Number(profile.dueAmount || 0) - dueAmount) > 0.01) {
        actions.push(`would-resync-profile:${profile.studentId}`);
      }
    }
  }

  await createAuditLog({
    userId: currentUserId,
    module: "ACCOUNTS",
    action: dryRun ? "FEE_LEDGER_REPAIR_DRY_RUN" : "FEE_LEDGER_REPAIR_RUN",
    metadata: {
      actionsCount: actions.length,
      blockedCount: blocked.length,
      dryRun
    }
  });

  return {
    dryRun,
    actionsCount: actions.length,
    blockedCount: blocked.length,
    actions: actions.slice(0, 200),
    blocked: blocked.slice(0, 200)
  };
}

export async function listAccountEntries(filters: AccountFilters = {}) {
  const dateFilter = getDateFilter(filters);

  const rows = await prisma.accountEntry.findMany({
    where: {
      ...(filters.entryType ? { entryType: normalizeEntryType(filters.entryType) } : {}),
      ...((filters.month || filters.dateFrom || filters.dateTo) ? { entryDate: dateFilter } : {})
    },
    include: {
      createdBy: true
    },
    orderBy: {
      entryDate: "desc"
    },
    take: 100
  });

  const totals = rows.reduce(
    (summary, row) => {
      const amount = Number(row.amount);
      if (row.entryType === AccountEntryType.INCOME) {
        summary.income += amount;
      } else if (row.entryType === AccountEntryType.EXPENSE) {
        summary.expense += amount;
      } else {
        summary.bankDeposit += amount;
      }
      return summary;
    },
    { income: 0, expense: 0, bankDeposit: 0 }
  );

  const paymentModeTotals = rows.reduce<Record<string, number>>((summary, row) => {
    const key = row.paymentMode || "UNKNOWN";
    summary[key] = (summary[key] || 0) + Number(row.amount);
    return summary;
  }, {});

  const formattedPaymentModeTotals: PaymentModeTotals = Object.fromEntries(
    Object.entries(paymentModeTotals).map(([key, value]) => [key, value.toFixed(2)])
  );

  const partyLedgerRows = rows
    .filter((row) => row.partyName)
    .reduce<Record<string, { partyName: string; entries: number; income: number; expense: number; latestDate: Date }>>((summary, row) => {
      const key = row.partyName || "UNKNOWN";
      if (!summary[key]) {
        summary[key] = {
          partyName: key,
          entries: 0,
          income: 0,
          expense: 0,
          latestDate: row.entryDate
        };
      }

      summary[key].entries += 1;
      if (row.entryDate > summary[key].latestDate) {
        summary[key].latestDate = row.entryDate;
      }

      if (row.entryType === AccountEntryType.EXPENSE || row.entryType === AccountEntryType.BANK_DEPOSIT) {
        summary[key].expense += Number(row.amount);
      } else {
        summary[key].income += Number(row.amount);
      }

      return summary;
    }, {});

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const openingBalanceRow = await prisma.accountEntry.findFirst({
    where: {
      entryType: AccountEntryType.OPENING_BALANCE,
      entryDate: {
        gte: todayStart,
        lte: todayEnd
      }
    },
    orderBy: {
      entryDate: "asc"
    }
  });

  const todayRows = rows.filter((row) => {
    const date = new Date(row.entryDate);
    return date >= todayStart && date <= todayEnd;
  });

  const todayCashReceipts = todayRows.reduce((sum, row) => {
    if ((row.entryType === "INCOME" || row.entryType === "OPENING_BALANCE") && row.paymentMode === "CASH") {
      return sum + Number(row.amount);
    }
    return sum;
  }, 0);

  const todayCashExpenses = todayRows.reduce((sum, row) => {
    if (row.entryType === "EXPENSE" && row.paymentMode === "CASH") {
      return sum + Number(row.amount);
    }
    return sum;
  }, 0);

  const todayBankDeposits = todayRows.reduce((sum, row) => {
    if (row.entryType === "BANK_DEPOSIT") {
      return sum + Number(row.amount);
    }
    return sum;
  }, 0);

  const todayOpeningBalance = Number(openingBalanceRow?.amount || 0);
  const todayClosingBalance = todayOpeningBalance + (todayCashReceipts - todayOpeningBalance) - todayCashExpenses - todayBankDeposits;

  const formattedRows: AccountListRow[] = rows.map((row, index) => ({
    id: row.id,
    voucherNo: buildAccountVoucher(row.entryType, row.entryDate, index + 1),
    entryType: row.entryType,
    category: row.category,
    head: row.head,
    subHead: row.subHead,
    partyName: row.partyName,
    amount: row.amount.toString(),
    paymentMode: row.paymentMode,
    referenceNo: row.referenceNo,
    note: row.note,
    entryDate: row.entryDate.toISOString(),
    createdByName: row.createdBy?.name || "System"
  }));

  const groupedHeadSummary = formattedRows.reduce<Record<string, { entries: number; total: number }>>((acc, row) => {
      const key = row.head || row.category || "UNCLASSIFIED";
      if (!acc[key]) {
        acc[key] = { entries: 0, total: 0 };
      }
      acc[key].entries += 1;
      acc[key].total += Number(row.amount || 0);
      return acc;
    }, {});

  const headSummary: HeadSummaryRow[] = Object.entries(groupedHeadSummary).map(([head, value]) => ({
      head,
      entries: String(value.entries),
      total: value.total.toFixed(2)
    }))
    .sort((left, right) => Number(right.total) - Number(left.total));

  const incomeHeadSummary = formattedRows
    .filter((row) => row.entryType === AccountEntryType.INCOME)
    .reduce<Record<string, { entries: number; total: number }>>((acc, row) => {
      const key = row.head || row.category || "UNCLASSIFIED";
      if (!acc[key]) {
        acc[key] = { entries: 0, total: 0 };
      }
      acc[key].entries += 1;
      acc[key].total += Number(row.amount || 0);
      return acc;
    }, {});

  const expenseHeadSummary = formattedRows
    .filter((row) => row.entryType === AccountEntryType.EXPENSE)
    .reduce<Record<string, { entries: number; total: number }>>((acc, row) => {
      const key = row.head || row.category || "UNCLASSIFIED";
      if (!acc[key]) {
        acc[key] = { entries: 0, total: 0 };
      }
      acc[key].entries += 1;
      acc[key].total += Number(row.amount || 0);
      return acc;
    }, {});

  const topIncomeHeads: HeadSummaryRow[] = Object.entries(incomeHeadSummary)
    .map(([head, value]) => ({
      head,
      entries: String(value.entries),
      total: value.total.toFixed(2)
    }))
    .sort((left, right) => Number(right.total) - Number(left.total))
    .slice(0, 5);

  const topExpenseHeads: HeadSummaryRow[] = Object.entries(expenseHeadSummary)
    .map(([head, value]) => ({
      head,
      entries: String(value.entries),
      total: value.total.toFixed(2)
    }))
    .sort((left, right) => Number(right.total) - Number(left.total))
    .slice(0, 5);

  const bankbookMovement = formattedRows
    .filter((row) => ["BANK_TRANSFER", "ONLINE", "UPI", "BANK", "CHEQUE"].includes(row.paymentMode) || row.entryType === AccountEntryType.BANK_DEPOSIT)
    .reduce(
      (acc, row) => {
        const amount = Number(row.amount || 0);
        if (row.entryType === AccountEntryType.INCOME) {
          acc.digitalReceipts += amount;
        } else if (row.entryType === AccountEntryType.BANK_DEPOSIT) {
          acc.cashDeposits += amount;
        } else {
          acc.bankExpenses += amount;
        }
        return acc;
      },
      { digitalReceipts: 0, cashDeposits: 0, bankExpenses: 0 }
    );

  const bankbookExpectedBalance = bankbookMovement.digitalReceipts + bankbookMovement.cashDeposits - bankbookMovement.bankExpenses;

  const allRows = await prisma.accountEntry.findMany({
    include: {
      createdBy: true
    },
    orderBy: {
      entryDate: "desc"
    }
  });

  const monthBuckets = allRows.reduce<Record<string, { income: number; expense: number; bankDeposit: number }>>((acc, row) => {
    const monthKey = row.entryDate.toISOString().slice(0, 7);
    if (!acc[monthKey]) {
      acc[monthKey] = { income: 0, expense: 0, bankDeposit: 0 };
    }
    const amount = Number(row.amount || 0);
    if (row.entryType === AccountEntryType.INCOME) {
      acc[monthKey].income += amount;
    } else if (row.entryType === AccountEntryType.EXPENSE) {
      acc[monthKey].expense += amount;
    } else if (row.entryType === AccountEntryType.BANK_DEPOSIT) {
      acc[monthKey].bankDeposit += amount;
    }
    return acc;
  }, {});

  const monthlyTrend: MonthlyTrendRow[] = Object.entries(monthBuckets)
    .sort(([left], [right]) => right.localeCompare(left))
    .slice(0, 6)
    .map(([month, value]) => ({
      month,
      income: value.income.toFixed(2),
      expense: value.expense.toFixed(2),
      bankDeposit: value.bankDeposit.toFixed(2),
      netBalance: (value.income - value.expense).toFixed(2)
    }));

  const topPartyContributors: PartyContributionRow[] = Object.values(partyLedgerRows)
    .sort((left, right) => (right.income + right.expense) - (left.income + left.expense))
    .slice(0, 6)
    .map((row) => ({
      partyName: row.partyName,
      totalIncome: row.income.toFixed(2),
      totalExpense: row.expense.toFixed(2),
      netBalance: (row.income - row.expense).toFixed(2)
    }));

  return {
    summary: {
      totalIncome: totals.income.toFixed(2),
      totalExpense: totals.expense.toFixed(2),
      totalBankDeposit: totals.bankDeposit.toFixed(2),
      netBalance: (totals.income - totals.expense).toFixed(2),
      paymentModeTotals: formattedPaymentModeTotals,
      todayOpeningBalance: todayOpeningBalance.toFixed(2),
      todayCashReceipts: (todayCashReceipts - todayOpeningBalance).toFixed(2),
      todayCashExpenses: todayCashExpenses.toFixed(2),
      todayBankDeposits: todayBankDeposits.toFixed(2),
      todayClosingBalance: todayClosingBalance.toFixed(2)
    },
    headSummary,
    bankReconciliation: {
      digitalReceipts: bankbookMovement.digitalReceipts.toFixed(2),
      cashDeposits: bankbookMovement.cashDeposits.toFixed(2),
      bankExpenses: bankbookMovement.bankExpenses.toFixed(2),
      expectedBankbookBalance: bankbookExpectedBalance.toFixed(2)
    },
    topIncomeHeads,
    topExpenseHeads,
    monthlyTrend,
    topPartyContributors,
    cashbookRows: rows
      .filter((row) => row.paymentMode === "CASH" || row.entryType === AccountEntryType.BANK_DEPOSIT || row.entryType === AccountEntryType.OPENING_BALANCE)
      .map((row, index) => ({
        id: row.id,
        voucherNo: buildAccountVoucher(row.entryType, row.entryDate, index + 1),
        entryDate: row.entryDate.toISOString(),
        entryType: row.entryType,
        head: row.head,
        subHead: row.subHead,
        partyName: row.partyName,
        amount: row.amount.toString(),
        paymentMode: row.paymentMode,
        referenceNo: row.referenceNo,
        note: row.note
      })),
    bankbookRows: rows
      .filter((row) => ["BANK_TRANSFER", "ONLINE", "UPI", "BANK", "CHEQUE"].includes(row.paymentMode) || row.entryType === AccountEntryType.BANK_DEPOSIT)
      .map((row, index) => ({
        id: row.id,
        voucherNo: buildAccountVoucher(row.entryType, row.entryDate, index + 1),
        entryDate: row.entryDate.toISOString(),
        entryType: row.entryType,
        head: row.head,
        subHead: row.subHead,
        partyName: row.partyName,
        amount: row.amount.toString(),
        paymentMode: row.paymentMode,
        referenceNo: row.referenceNo,
        note: row.note
      })),
    partyLedgerRows: Object.values(partyLedgerRows)
      .sort((left, right) => right.latestDate.getTime() - left.latestDate.getTime())
      .map((row) => ({
        partyName: row.partyName,
        entries: String(row.entries),
        totalIncome: row.income.toFixed(2),
        totalExpense: row.expense.toFixed(2),
        netBalance: (row.income - row.expense).toFixed(2),
        latestDate: row.latestDate.toISOString()
      })),
    rows: formattedRows
  };
}

export async function getPartyLedgerDetails(partyName: string, filters: AccountFilters = {}) {
  const trimmedPartyName = partyName.trim();
  if (!trimmedPartyName) {
    throw new Error("Party name is required");
  }

  const dateFilter = getDateFilter(filters);
  const rows = await prisma.accountEntry.findMany({
    where: {
      partyName: trimmedPartyName,
      ...((filters.month || filters.dateFrom || filters.dateTo) ? { entryDate: dateFilter } : {})
    },
    include: {
      createdBy: true
    },
    orderBy: {
      entryDate: "desc"
    }
  });

  const formattedRows: AccountListRow[] = rows.map((row, index) => ({
    id: row.id,
    voucherNo: buildAccountVoucher(row.entryType, row.entryDate, index + 1),
    entryType: row.entryType,
    category: row.category,
    head: row.head,
    subHead: row.subHead,
    partyName: row.partyName,
    amount: row.amount.toString(),
    paymentMode: row.paymentMode,
    referenceNo: row.referenceNo,
    note: row.note,
    entryDate: row.entryDate.toISOString(),
    createdByName: row.createdBy?.name || "System"
  }));

  const totals = rows.reduce(
    (summary, row) => {
      const amount = Number(row.amount);
      if (row.entryType === AccountEntryType.EXPENSE || row.entryType === AccountEntryType.BANK_DEPOSIT) {
        summary.outgoing += amount;
      } else {
        summary.incoming += amount;
      }
      return summary;
    },
    { incoming: 0, outgoing: 0 }
  );

  return {
    partyName: trimmedPartyName,
    rows: formattedRows,
    summary: {
      incoming: totals.incoming.toFixed(2),
      outgoing: totals.outgoing.toFixed(2),
      netBalance: (totals.incoming - totals.outgoing).toFixed(2)
    }
  };
}

export async function getMonthlyFinanceSummary(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("Month is invalid");
  }

  const { summary, rows, cashbookRows, bankbookRows, partyLedgerRows, headSummary, bankReconciliation } = await listAccountEntries({ month });
  return {
    month,
    monthLabel: new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(`${month}-01T00:00:00.000Z`)),
    summary,
    headSummary,
    rows,
    cashbookRows,
    bankbookRows,
    partyLedgerRows,
    bankReconciliation
  };
}

export async function getPeriodicFinanceSummary(input: {
  period?: string;
  reportDate?: string;
  weekDate?: string;
  month?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const period = (input.period || "MONTHLY") as FinanceReportPeriod;

  let dateFrom = "";
  let dateTo = "";
  let label = "";

  if (period === "DAILY") {
    const target = input.reportDate || new Date().toISOString().slice(0, 10);
    dateFrom = target;
    dateTo = target;
    label = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${target}T00:00:00.000Z`));
  } else if (period === "WEEKLY") {
    const base = new Date(`${(input.weekDate || new Date().toISOString().slice(0, 10))}T00:00:00.000Z`);
    const day = base.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(base);
    start.setUTCDate(base.getUTCDate() + diffToMonday);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    dateFrom = start.toISOString().slice(0, 10);
    dateTo = end.toISOString().slice(0, 10);
    label = `${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(start)} to ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(end)}`;
  } else if (period === "CUSTOM") {
    dateFrom = input.dateFrom || "";
    dateTo = input.dateTo || "";
    if (!dateFrom || !dateTo) {
      throw new Error("Custom report requires from date and to date");
    }
    label = `${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${dateFrom}T00:00:00.000Z`))} to ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${dateTo}T00:00:00.000Z`))}`;
  } else {
    const month = input.month || new Date().toISOString().slice(0, 7);
    const monthly = await getMonthlyFinanceSummary(month);
    return {
      period,
      label: monthly.monthLabel,
      summary: monthly.summary,
      headSummary: monthly.headSummary,
      rows: monthly.rows,
      cashbookRows: monthly.cashbookRows,
      bankbookRows: monthly.bankbookRows,
      partyLedgerRows: monthly.partyLedgerRows,
      bankReconciliation: monthly.bankReconciliation
    };
  }

  const { summary, rows, cashbookRows, bankbookRows, partyLedgerRows, headSummary, bankReconciliation } = await listAccountEntries({
    dateFrom,
    dateTo
  });

  return {
    period,
    label,
    summary,
    headSummary,
    rows,
    cashbookRows,
    bankbookRows,
    partyLedgerRows,
    bankReconciliation
  };
}
