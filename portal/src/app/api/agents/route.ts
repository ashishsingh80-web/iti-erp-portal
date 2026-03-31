import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { previewGeneratedCode, reserveGeneratedCode } from "@/lib/numbering-config";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "agents", "view");
    const url = new URL(request.url);
    if (url.searchParams.get("preview") === "code") {
      const code = await previewGeneratedCode("agent");
      return NextResponse.json({ ok: true, code });
    }

    const agents = await prisma.agent.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({
      ok: true,
      agents: agents.map((item) => ({
        id: item.id,
        agentCode: item.agentCode,
        name: item.name,
        mobile: item.mobile,
        defaultAgreement: item.defaultAgreement,
        defaultValue: item.defaultValue?.toString() || "",
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString()
      }))
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load agents"
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "agents", "add");

    const payload = (await request.json()) as {
      agentCode?: string;
      name?: string;
      mobile?: string;
      defaultAgreement?: string;
      defaultValue?: string | number | null;
    };

    if (!payload.name?.trim()) {
      return NextResponse.json({ ok: false, message: "Agent name is required" }, { status: 400 });
    }

    const agentCode = payload.agentCode?.trim() || (await reserveGeneratedCode("agent"));

    const created = await prisma.agent.create({
      data: {
        agentCode: agentCode.toUpperCase(),
        name: payload.name.trim(),
        mobile: payload.mobile?.trim() || null,
        defaultAgreement: payload.defaultAgreement?.trim() || null,
        defaultValue:
          payload.defaultValue !== undefined && payload.defaultValue !== null && String(payload.defaultValue).trim()
            ? Number(payload.defaultValue)
            : null,
        isActive: true
      }
    });

    return NextResponse.json({
      ok: true,
      agent: {
        id: created.id,
        agentCode: created.agentCode,
        name: created.name,
        mobile: created.mobile,
        defaultAgreement: created.defaultAgreement,
        defaultValue: created.defaultValue?.toString() || "",
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to create agent"
      },
      { status: 400 }
    );
  }
}
