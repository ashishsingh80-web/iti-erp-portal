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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ leaveId: string }> }
) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "hr", "edit");
    const { leaveId } = await params;

    const payload = (await request.json()) as {
      leaveType?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
      totalDays?: string | number;
      reason?: string;
      approvalNote?: string;
    };

    const existing = await prismaAny.hrLeaveRecord.findUnique({ where: { id: leaveId } });
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Leave record not found" }, { status: 404 });
    }

    const nextStatus = payload.status?.trim().toUpperCase() || existing.status;
    const fromDate = toDate(payload.fromDate) || existing.fromDate;
    const tillDate = toDate(payload.toDate) || existing.toDate;
    if (fromDate.getTime() > tillDate.getTime()) {
      return NextResponse.json({ ok: false, message: "Leave end date must be after start date" }, { status: 400 });
    }

    const totalDays =
      toDecimal(payload.totalDays) ||
      Number((((tillDate.getTime() - fromDate.getTime()) / 86400000) + 1).toFixed(2));

    const updated = await prismaAny.hrLeaveRecord.update({
      where: { id: leaveId },
      data: {
        leaveType: payload.leaveType?.trim().toUpperCase() || existing.leaveType,
        status: nextStatus,
        fromDate,
        toDate: tillDate,
        totalDays,
        reason: payload.reason === undefined ? existing.reason : toNullable(payload.reason),
        approvalNote: payload.approvalNote === undefined ? existing.approvalNote : toNullable(payload.approvalNote),
        approvedById: nextStatus === "APPROVED" ? user.id : nextStatus === "REJECTED" ? user.id : existing.approvedById
      },
      include: {
        staff: true,
        approvedBy: true,
        createdBy: true
      }
    });

    return NextResponse.json({ ok: true, leave: serializeLeave(updated) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to update leave record" },
      { status: 400 }
    );
  }
}
