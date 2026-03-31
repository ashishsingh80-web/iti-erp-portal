import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const instituteSchema = z.object({
  instituteCode: z.string().trim().min(1, "Institute code is required"),
  name: z.string().trim().min(2, "Institute name is required"),
  scvtCode: z.string().trim().optional().or(z.literal("")),
  sidhCode: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  status: z.boolean().default(true)
});

function assertAdmin(role: string) {
  if (!["SUPER_ADMIN", "ADMIN"].includes(role)) {
    throw new Error("Access denied for institute settings");
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    assertAdmin(user.role);

    const institutes = await prisma.institute.findMany({
      orderBy: { instituteCode: "asc" }
    });

    return NextResponse.json({
      ok: true,
      institutes: institutes.map((item) => ({
        id: item.id,
        instituteCode: item.instituteCode,
        name: item.name,
        scvtCode: item.scvtCode || "",
        sidhCode: item.sidhCode || "",
        address: item.address || "",
        status: item.status
      }))
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to load institutes" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertAdmin(user.role);
    const payload = instituteSchema.parse(await request.json());

    const institute = await prisma.institute.create({
      data: {
        instituteCode: payload.instituteCode.toUpperCase(),
        name: payload.name.trim(),
        scvtCode: payload.scvtCode?.trim() || null,
        sidhCode: payload.sidhCode?.trim() || null,
        address: payload.address?.trim() || null,
        status: payload.status
      }
    });

    return NextResponse.json({
      ok: true,
      institute: {
        id: institute.id,
        instituteCode: institute.instituteCode,
        name: institute.name,
        scvtCode: institute.scvtCode || "",
        sidhCode: institute.sidhCode || "",
        address: institute.address || "",
        status: institute.status
      }
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to create institute" }, { status: 400 });
  }
}
