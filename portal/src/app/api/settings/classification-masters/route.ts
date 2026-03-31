import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  readClassificationMasters,
  saveClassificationMasters
} from "@/lib/classification-masters";

function assertAdmin(role: string) {
  if (!["SUPER_ADMIN", "ADMIN"].includes(role)) {
    throw new Error("Access denied for classification master settings");
  }
}

const optionSchema = z.object({
  label: z.string().trim().min(1),
  value: z.string().trim().min(1)
});

const payloadSchema = z.object({
  categories: z.array(optionSchema).min(1),
  religions: z.array(optionSchema).min(1),
  castes: z.array(optionSchema).min(1),
  qualifications: z.array(optionSchema).min(1)
});

export async function GET() {
  try {
    const user = await requireUser();
    assertAdmin(user.role);
    const config = await readClassificationMasters();
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load classification masters" },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    assertAdmin(user.role);
    const payload = payloadSchema.parse(await request.json());
    const config = await saveClassificationMasters(payload);
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to save classification masters" },
      { status: 400 }
    );
  }
}
