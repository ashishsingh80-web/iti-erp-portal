import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const prismaAny = prisma as any;

function toNullable(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toDate(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDecimal(value?: string | number | null) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function serializeLeave(item: any) {
  return {
    id: item.id,
    staffId: item.staffId,
    staffName: item.staff.fullName,
    employeeCode: item.staff.employeeCode,
    leaveType: item.leaveType,
    status: item.status,
    fromDate: item.fromDate.toISOString().slice(0, 10),
    toDate: item.toDate.toISOString().slice(0, 10),
    totalDays: item.totalDays?.toString() || "0",
    reason: item.reason || "",
    approvalNote: item.approvalNote || "",
    approvedByName: item.approvedBy?.name || "",
    createdByName: item.createdBy?.name || "System",
    createdAt: item.createdAt.toISOString()
  };
}

export async function GET() {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "hr", "view");

    const leaves = await prismaAny.hrLeaveRecord.findMany({
      include: {
        staff: true,
        approvedBy: true,
        createdBy: true
      },
      orderBy: [{ fromDate: "desc" }, { createdAt: "desc" }],
      take: 120
    });

    return NextResponse.json({
      ok: true,
      leaves: leaves.map((item: any) => serializeLeave(item))
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load leave records" },
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
      leaveType?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
      totalDays?: string | number;
      reason?: string;
      approvalNote?: string;
    };

    const fromDate = toDate(payload.fromDate);
    const tillDate = toDate(payload.toDate);
    if (!payload.staffId || !payload.leaveType?.trim() || !fromDate || !tillDate) {
      return NextResponse.json(
        { ok: false, message: "Staff, leave type, from date, and to date are required" },
        { status: 400 }
      );
    }

    if (fromDate.getTime() > tillDate.getTime()) {
      return NextResponse.json({ ok: false, message: "Leave end date must be after start date" }, { status: 400 });
    }

    const totalDays =
      toDecimal(payload.totalDays) ||
      Number((((tillDate.getTime() - fromDate.getTime()) / 86400000) + 1).toFixed(2));

    const created = await prismaAny.hrLeaveRecord.create({
      data: {
        staffId: payload.staffId,
        leaveType: payload.leaveType.trim().toUpperCase(),
        status: (payload.status?.trim().toUpperCase() || "PENDING"),
        fromDate,
        toDate: tillDate,
        totalDays,
        reason: toNullable(payload.reason),
        approvalNote: toNullable(payload.approvalNote),
        approvedById: (payload.status?.trim().toUpperCase() || "PENDING") === "APPROVED" ? user.id : null,
        createdById: user.id
      },
      include: {
        staff: true,
        approvedBy: true,
        createdBy: true
      }
    });

    return NextResponse.json({ ok: true, leave: serializeLeave(created) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to save leave record" },
      { status: 400 }
    );
  }
}
