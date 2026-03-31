import { NextResponse } from "next/server";
import { AccountEntryType } from "@prisma/client";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAccountsDateClosed } from "@/lib/services/accounts-service";

function toNullable(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function GET() {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "hr", "view");

    const payments = await prisma.hrPayment.findMany({
      include: {
        staff: true,
        createdBy: true
      },
      orderBy: {
        paymentDate: "desc"
      },
      take: 60
    });

    return NextResponse.json({
      ok: true,
      payments: payments.map((item) => ({
        id: item.id,
        staffId: item.staffId,
        staffName: item.staff.fullName,
        employeeCode: item.staff.employeeCode,
        paymentMonth: item.paymentMonth || "",
        paymentDate: item.paymentDate.toISOString().slice(0, 10),
        grossAmount: item.grossAmount.toString(),
        deductionsAmount: item.deductionsAmount.toString(),
        netAmount: item.netAmount.toString(),
        paymentMode: item.paymentMode,
        referenceNo: item.referenceNo,
        note: item.note,
        createdByName: item.createdBy?.name || "System",
        createdAt: item.createdAt.toISOString()
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load HR payments" },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "hr", "add");

    const payload = (await request.json()) as {
      staffId?: string;
      paymentMonth?: string;
      paymentDate?: string;
      grossAmount?: string | number;
      deductionsAmount?: string | number;
      paymentMode?: string;
      referenceNo?: string;
      note?: string;
    };

    if (!payload.staffId || !payload.paymentDate || !payload.paymentMode || payload.grossAmount === undefined) {
      return NextResponse.json({ ok: false, message: "Staff, payment date, gross amount, and payment mode are required" }, { status: 400 });
    }

    const grossAmount = Number(payload.grossAmount);
    const deductionsAmount = Number(payload.deductionsAmount || 0);

    if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
      return NextResponse.json({ ok: false, message: "Gross amount must be greater than zero" }, { status: 400 });
    }

    if (!Number.isFinite(deductionsAmount) || deductionsAmount < 0) {
      return NextResponse.json({ ok: false, message: "Deductions cannot be negative" }, { status: 400 });
    }

    const paymentDate = new Date(payload.paymentDate);
    if (Number.isNaN(paymentDate.getTime())) {
      return NextResponse.json({ ok: false, message: "Payment date is invalid" }, { status: 400 });
    }

    if (await isAccountsDateClosed(paymentDate)) {
      return NextResponse.json({ ok: false, message: "Selected payment date is already closed in accounts" }, { status: 400 });
    }

    const netAmount = grossAmount - deductionsAmount;
    if (netAmount < 0) {
      return NextResponse.json({ ok: false, message: "Net amount cannot be negative" }, { status: 400 });
    }

    const staff = await prisma.hrStaff.findUnique({
      where: { id: payload.staffId }
    });

    if (!staff) {
      return NextResponse.json({ ok: false, message: "Staff record not found" }, { status: 404 });
    }

    const normalizedPaymentMode = payload.paymentMode.trim();
    const normalizedNote = toNullable(payload.note);
    const normalizedReference = toNullable(payload.referenceNo);
    const paymentMonth = toNullable(payload.paymentMonth);

    const created = await prisma.$transaction(async (tx) => {
      const payment = await tx.hrPayment.create({
        data: {
          staffId: payload.staffId!,
          paymentMonth,
          paymentDate,
          grossAmount,
          deductionsAmount,
          netAmount,
          paymentMode: normalizedPaymentMode,
          referenceNo: normalizedReference,
          note: normalizedNote,
          createdById: user.id
        },
        include: {
          staff: true,
          createdBy: true
        }
      });

      const isExperienceIncome = payment.staff.isExperienceCase;
      const staffCategorySubHead =
        payment.staff.staffCategory === "NON_TECHNICAL_TEACHING"
          ? "TEACHING_STAFF"
          : payment.staff.staffCategory === "NON_TEACHING"
            ? "OFFICE_STAFF"
            : "TEACHING_STAFF";

      await tx.accountEntry.create({
        data: {
          entryType: isExperienceIncome ? AccountEntryType.INCOME : AccountEntryType.EXPENSE,
          category: isExperienceIncome ? "OTHER_INCOME" : "SALARY",
          head: isExperienceIncome ? "OTHER_INCOME" : "SALARY_WAGES",
          subHead: isExperienceIncome ? "EXPERIENCE_CERTIFICATE_INCOME" : staffCategorySubHead,
          partyName: `${payment.staff.employeeCode} • ${payment.staff.fullName}`,
          amount: netAmount,
          paymentMode: normalizedPaymentMode,
          referenceNo: normalizedReference,
          note:
            normalizedNote ||
            (isExperienceIncome
              ? `Experience certificate agreement receipt for ${payment.staff.fullName}`
              : `Salary payment for ${payment.staff.fullName}`),
          entryDate: paymentDate,
          createdById: user.id
        }
      });

      return payment;
    });

    return NextResponse.json({
      ok: true,
      payment: {
        id: created.id,
        staffId: created.staffId,
        staffName: created.staff.fullName,
        employeeCode: created.staff.employeeCode,
        paymentMonth: created.paymentMonth || "",
        paymentDate: created.paymentDate.toISOString().slice(0, 10),
        grossAmount: created.grossAmount.toString(),
        deductionsAmount: created.deductionsAmount.toString(),
        netAmount: created.netAmount.toString(),
        paymentMode: created.paymentMode,
        referenceNo: created.referenceNo,
        note: created.note,
        createdByName: created.createdBy?.name || "System",
        createdAt: created.createdAt.toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to save HR payment" },
      { status: 400 }
    );
  }
}
