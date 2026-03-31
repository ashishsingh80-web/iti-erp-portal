import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readInstituteBrandingConfig,
  saveInstituteBrandingConfig
} from "@/lib/institute-branding-config";

function assertAdmin(role: string) {
  if (!["SUPER_ADMIN", "ADMIN"].includes(role)) {
    throw new Error("Access denied for institute branding settings");
  }
}

const rowSchema = z.object({
  instituteCode: z.string().trim().min(1),
  campusName: z.string().trim().optional().default(""),
  contactPhone: z.string().trim().optional().default(""),
  contactEmail: z.string().trim().optional().default(""),
  website: z.string().trim().optional().default(""),
  principalName: z.string().trim().optional().default(""),
  ncvtCode: z.string().trim().optional().default(""),
  affiliationNumber: z.string().trim().optional().default(""),
  affiliationValidFrom: z.string().trim().optional().default(""),
  affiliationValidTo: z.string().trim().optional().default(""),
  logoUrl: z.string().trim().optional().default(""),
  sealUrl: z.string().trim().optional().default(""),
  signatureUrl: z.string().trim().optional().default(""),
  signatureLabel: z.string().trim().optional().default(""),
  certificateFooterText: z.string().trim().optional().default(""),
  receiptHeaderText: z.string().trim().optional().default("")
});

const payloadSchema = z.object({
  institutes: z.array(rowSchema)
});

export async function GET() {
  try {
    const user = await requireUser();
    assertAdmin(user.role);

    const [branding, institutes] = await Promise.all([
      readInstituteBrandingConfig(),
      prisma.institute.findMany({
        orderBy: { instituteCode: "asc" }
      })
    ]);

    const brandingMap = new Map(branding.institutes.map((item) => [item.instituteCode, item]));
    const rows = institutes.map((institute) => {
      const saved = brandingMap.get(institute.instituteCode);
      return {
        instituteCode: institute.instituteCode,
        instituteName: institute.name,
        campusName: saved?.campusName || "",
        contactPhone: saved?.contactPhone || "",
        contactEmail: saved?.contactEmail || "",
        website: saved?.website || "",
        principalName: saved?.principalName || "",
        ncvtCode: saved?.ncvtCode || "",
        affiliationNumber: saved?.affiliationNumber || "",
        affiliationValidFrom: saved?.affiliationValidFrom || "",
        affiliationValidTo: saved?.affiliationValidTo || "",
        logoUrl: saved?.logoUrl || "",
        sealUrl: saved?.sealUrl || "",
        signatureUrl: saved?.signatureUrl || "",
        signatureLabel: saved?.signatureLabel || "",
        certificateFooterText: saved?.certificateFooterText || "",
        receiptHeaderText: saved?.receiptHeaderText || ""
      };
    });

    return NextResponse.json({
      ok: true,
      config: {
        institutes: rows,
        updatedAt: branding.updatedAt
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load institute branding settings" },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    assertAdmin(user.role);
    const payload = payloadSchema.parse(await request.json());
    const config = await saveInstituteBrandingConfig({
      institutes: payload.institutes
    });
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to save institute branding settings" },
      { status: 400 }
    );
  }
}
