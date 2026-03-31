import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readAcademicStructureConfig,
  saveAcademicStructureConfig
} from "@/lib/academic-structure-config";

function assertAdmin(role: string) {
  if (!["SUPER_ADMIN", "ADMIN"].includes(role)) {
    throw new Error("Access denied for academic structure settings");
  }
}

const payloadSchema = z.object({
  tradeStructures: z.array(
    z.object({
      instituteCode: z.string().trim().min(1),
      tradeCode: z.string().trim().min(1),
      unitCount: z.coerce.number().int().min(1),
      seatsPerUnit: z.coerce.number().int().min(1),
      batchLabels: z.array(z.string().trim().min(1)).min(1),
      shiftName: z.string().trim().min(1)
    })
  ),
  shifts: z.array(
    z.object({
      id: z.string().trim().optional().default(""),
      name: z.string().trim().min(1),
      startTime: z.string().trim().min(1),
      endTime: z.string().trim().min(1),
      isActive: z.boolean()
    })
  )
});

export async function GET() {
  try {
    const user = await requireUser();
    assertAdmin(user.role);

    const [config, trades] = await Promise.all([
      readAcademicStructureConfig(),
      prisma.trade.findMany({
        include: { institute: true },
        where: { isActive: true },
        orderBy: [{ institute: { instituteCode: "asc" } }, { tradeCode: "asc" }]
      })
    ]);

    const structureMap = new Map<string, (typeof config.tradeStructures)[number]>(
      config.tradeStructures.map((item) => [`${item.instituteCode}::${item.tradeCode}`, item])
    );

    const tradeStructures = trades.map((trade) => {
      const key = `${trade.institute.instituteCode}::${trade.tradeCode}`;
      const saved = structureMap.get(key);
      return {
        instituteCode: trade.institute.instituteCode,
        instituteName: trade.institute.name,
        tradeCode: trade.tradeCode,
        tradeName: trade.name,
        duration: trade.duration || "",
        unitCount: saved?.unitCount || 1,
        seatsPerUnit: saved?.seatsPerUnit || 20,
        batchLabels: saved?.batchLabels || ["A"],
        shiftName: saved?.shiftName || "Morning"
      };
    });

    return NextResponse.json({
      ok: true,
      config: {
        tradeStructures,
        shifts: config.shifts,
        updatedAt: config.updatedAt
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load academic structure settings" },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    assertAdmin(user.role);
    const payload = payloadSchema.parse(await request.json());

    const config = await saveAcademicStructureConfig({
      tradeStructures: payload.tradeStructures,
      shifts: payload.shifts
    });

    return NextResponse.json({
      ok: true,
      config
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to save academic structure settings" },
      { status: 400 }
    );
  }
}
