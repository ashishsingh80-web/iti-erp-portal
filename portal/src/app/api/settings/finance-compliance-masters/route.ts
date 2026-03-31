import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  readFinanceComplianceMasters,
  saveFinanceComplianceMasters
} from "@/lib/finance-compliance-masters";

function assertAdmin(role: string) {
  if (!["SUPER_ADMIN", "ADMIN"].includes(role)) {
    throw new Error("Access denied for finance and compliance master settings");
  }
}

const optionSchema = z.object({
  label: z.string().trim().min(1),
  value: z.string().trim().min(1)
});

const payloadSchema = z.object({
  feeHeads: z.array(optionSchema).min(1),
  scholarshipSchemes: z.array(optionSchema).min(1),
  documentTypes: z.array(optionSchema).min(1)
});

export async function GET() {
  try {
    const user = await requireUser();
    assertAdmin(user.role);
    const config = await readFinanceComplianceMasters();
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load finance and compliance masters" },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    assertAdmin(user.role);
    const payload = payloadSchema.parse(await request.json());
    const config = await saveFinanceComplianceMasters(payload);
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to save finance and compliance masters" },
      { status: 400 }
    );
  }
}
