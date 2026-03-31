import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "agents", "edit");
    const { agentId } = await params;

    const payload = (await request.json()) as {
      name?: string;
      mobile?: string;
      defaultAgreement?: string;
      defaultValue?: string | number | null;
      isActive?: boolean;
    };

    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
        ...(payload.mobile !== undefined ? { mobile: payload.mobile?.trim() || null } : {}),
        ...(payload.defaultAgreement !== undefined
          ? { defaultAgreement: payload.defaultAgreement?.trim() || null }
          : {}),
        ...(payload.defaultValue !== undefined
          ? {
              defaultValue:
                payload.defaultValue !== null && String(payload.defaultValue).trim()
                  ? Number(payload.defaultValue)
                  : null
            }
          : {}),
        ...(payload.isActive !== undefined ? { isActive: Boolean(payload.isActive) } : {})
      }
    });

    return NextResponse.json({
      ok: true,
      agent: {
        id: updated.id,
        agentCode: updated.agentCode,
        name: updated.name,
        mobile: updated.mobile,
        defaultAgreement: updated.defaultAgreement,
        defaultValue: updated.defaultValue?.toString() || "",
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to update agent"
      },
      { status: 400 }
    );
  }
}
