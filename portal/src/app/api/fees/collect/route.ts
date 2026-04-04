import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { FeeCollectionScope, FeePayerType } from "@prisma/client";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAccountsDateClosed } from "@/lib/services/accounts-service";
import { addFeePaymentInTx } from "@/lib/services/profile-operations-service";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "fees", "add");
    const payload = (await request.json()) as {
      items?: Array<{ studentId?: string; amountPaid?: number | string }>;
      payerType?: string;
      agentCode?: string;
      paymentMode?: string;
      referenceNo?: string;
      remark?: string;
      transactionDate?: string;
      idempotencyKey?: string;
    };

    const items = Array.isArray(payload.items) ? payload.items.filter((item) => item.studentId && item.amountPaid) : [];

    if (!items.length) {
      return NextResponse.json({ ok: false, message: "At least one student payment is required" }, { status: 400 });
    }

    const normalizedItems = items.map((item) => ({
      studentId: String(item.studentId),
      amountPaid: Number(item.amountPaid || 0)
    }));
    if (normalizedItems.some((item) => !Number.isFinite(item.amountPaid) || item.amountPaid <= 0)) {
      return NextResponse.json({ ok: false, message: "Payment amount must be greater than 0" }, { status: 400 });
    }
    const studentIdSet = new Set(normalizedItems.map((item) => item.studentId));
    if (studentIdSet.size !== normalizedItems.length) {
      return NextResponse.json({ ok: false, message: "Duplicate student entries found in this submission" }, { status: 400 });
    }

    const safeKey = String(payload.idempotencyKey || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "")
      .slice(0, 48);
    const requestGroup = safeKey ? `REQ-${safeKey}` : null;
    const allocationGroup = requestGroup || (items.length > 1 ? `BULK-${randomUUID().slice(0, 8).toUpperCase()}` : null);
    const payerType =
      payload.payerType === "AGENT" || payload.payerType === FeePayerType.AGENT
        ? FeePayerType.AGENT
        : FeePayerType.STUDENT;
    const paymentMode = String(payload.paymentMode || "CASH").trim();
    const transactionDate = payload.transactionDate ? new Date(payload.transactionDate) : new Date();
    if (Number.isNaN(transactionDate.getTime())) {
      return NextResponse.json({ ok: false, message: "Transaction date is invalid" }, { status: 400 });
    }
    if (await isAccountsDateClosed(transactionDate)) {
      return NextResponse.json({ ok: false, message: "Selected fee date is already closed in accounts" }, { status: 400 });
    }

    const agent =
      payerType === FeePayerType.AGENT
        ? await prisma.agent.findUnique({
            where: { agentCode: String(payload.agentCode || "").trim() }
          })
        : null;
    if (payerType === FeePayerType.AGENT && !agent) {
      return NextResponse.json({ ok: false, message: "Agent code is required for agent collections" }, { status: 400 });
    }

    if (requestGroup) {
      const existing = await prisma.feeTransaction.findMany({
        where: {
          allocationGroup: requestGroup,
          studentId: { in: Array.from(studentIdSet) }
        },
        select: {
          id: true,
          studentId: true,
          receiptNumber: true
        }
      });
      if (existing.length === normalizedItems.length) {
        return NextResponse.json({
          ok: true,
          allocationGroup,
          processed: normalizedItems.length,
          deduplicated: true,
          receipts: existing.map((row) => ({
            studentId: row.studentId,
            transactionId: row.id,
            receiptNo: row.receiptNumber || ""
          }))
        });
      }
    }

    const studentFeeRows = await prisma.student.findMany({
      where: {
        id: {
          in: Array.from(studentIdSet)
        }
      },
      select: {
        id: true,
        agentId: true,
        feeProfile: {
          select: {
            dueAmount: true
          }
        }
      }
    });
    if (studentFeeRows.length !== normalizedItems.length) {
      return NextResponse.json({ ok: false, message: "One or more selected students are invalid" }, { status: 400 });
    }
    const dueByStudent = new Map(studentFeeRows.map((row) => [row.id, Number(row.feeProfile?.dueAmount || 0)]));
    const overPayment = normalizedItems.find((item) => item.amountPaid > (dueByStudent.get(item.studentId) || 0) + 0.001);
    if (overPayment) {
      return NextResponse.json({ ok: false, message: "Entered amount is greater than current due for one or more students" }, { status: 400 });
    }

    if (payerType === FeePayerType.AGENT && agent) {
      const invalidAgentMappedStudents = studentFeeRows.filter((row) => row.agentId !== agent.id);
      if (invalidAgentMappedStudents.length) {
        return NextResponse.json(
          { ok: false, message: "One or more selected students are not mapped to the selected agent" },
          { status: 400 }
        );
      }
    }

    const receipts = await prisma.$transaction(async (tx) => {
      const created: Array<{ studentId: string; transactionId: string; receiptNo: string }> = [];
      for (const item of normalizedItems) {
        const payment = await addFeePaymentInTx(tx, {
          studentId: item.studentId,
          amountPaid: item.amountPaid,
          payerType,
          collectionScope: normalizedItems.length > 1 ? FeeCollectionScope.BULK : FeeCollectionScope.STUDENT_WISE,
          paymentMode,
          transactionDate,
          agentId: agent?.id || null,
          allocationGroup,
          referenceNo: payload.referenceNo?.trim() || null,
          remark: payload.remark?.trim() || null,
          createdById: user.id
        });
        created.push({
          studentId: item.studentId,
          transactionId: payment.transactionId,
          receiptNo: payment.receiptNumber
        });
      }
      return created;
    });

    return NextResponse.json({
      ok: true,
      allocationGroup,
      processed: normalizedItems.length,
      receipts
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to collect fees"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
