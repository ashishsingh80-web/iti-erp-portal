import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const tradeSchema = z.object({
  instituteCode: z.string().trim().min(1, "Institute is required"),
  tradeCode: z.string().trim().min(1, "Trade code is required"),
  name: z.string().trim().min(2, "Trade name is required"),
  duration: z.string().trim().optional().or(z.literal("")),
  ncvtScvt: z.string().trim().optional().or(z.literal("")),
  standardFees: z.union([z.string(), z.number(), z.null()]).optional(),
  isActive: z.boolean().default(true)
});

function assertAdmin(role: string) {
  if (!["SUPER_ADMIN", "ADMIN"].includes(role)) {
    throw new Error("Access denied for trade settings");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tradeId: string }> }
) {
  try {
    const user = await requireUser();
    assertAdmin(user.role);
    const { tradeId } = await params;
    const payload = tradeSchema.parse(await request.json());

    const institute = await prisma.institute.findUnique({
      where: { instituteCode: payload.instituteCode.toUpperCase() }
    });

    if (!institute) {
      return NextResponse.json({ ok: false, message: "Institute not found" }, { status: 404 });
    }

    const trade = await prisma.trade.update({
      where: { id: tradeId },
      data: {
        instituteId: institute.id,
        tradeCode: payload.tradeCode.toUpperCase(),
        name: payload.name.trim(),
        duration: payload.duration?.trim() || null,
        ncvtScvt: payload.ncvtScvt?.trim() || null,
        standardFees: payload.standardFees !== undefined && payload.standardFees !== null && String(payload.standardFees).trim() ? Number(payload.standardFees) : null,
        isActive: payload.isActive
      }
    });

    return NextResponse.json({
      ok: true,
      trade: {
        id: trade.id,
        instituteCode: institute.instituteCode,
        tradeCode: trade.tradeCode,
        name: trade.name,
        duration: trade.duration || "",
        ncvtScvt: trade.ncvtScvt || "",
        standardFees: trade.standardFees?.toString() || "",
        isActive: trade.isActive
      }
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to update trade" }, { status: 400 });
  }
}
