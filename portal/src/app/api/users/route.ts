import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { findInvalidActionKeysForModules } from "@/lib/access";
import { hashPassword, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/audit-service";

export async function GET() {
  const user = await requireUser();

  if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
    return NextResponse.json(
      {
        ok: false,
        message: "You do not have access to user management"
      },
      { status: 403 }
    );
  }

  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc"
    }
  });

  return NextResponse.json({
    ok: true,
    users: users.map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      role: item.role,
      isActive: item.isActive,
      hasCustomModuleAccess: item.hasCustomModuleAccess,
      allowedModuleSlugs: item.allowedModuleSlugs,
      hasCustomActionAccess: item.hasCustomActionAccess,
      allowedActionKeys: item.allowedActionKeys
    }))
  });
}

export async function POST(request: Request) {
  const user = await requireUser();

  if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
    return NextResponse.json(
      {
        ok: false,
        message: "You do not have access to create users"
      },
      { status: 403 }
    );
  }

  try {
    const payload = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      hasCustomModuleAccess?: boolean;
      allowedModuleSlugs?: string[];
      hasCustomActionAccess?: boolean;
      allowedActionKeys?: string[];
    };

    if (!payload.name?.trim() || !payload.email?.trim() || !payload.password?.trim() || !payload.role) {
      return NextResponse.json(
        {
          ok: false,
          message: "Name, email, password, and role are required"
        },
        { status: 400 }
      );
    }
    const hasCustomModuleAccess = Boolean(payload.hasCustomModuleAccess);
    const hasCustomActionAccess = Boolean(payload.hasCustomActionAccess);
    const allowedModuleSlugs = payload.allowedModuleSlugs || [];
    const allowedActionKeys = payload.allowedActionKeys || [];
    if (hasCustomModuleAccess && hasCustomActionAccess) {
      const invalidActionKeys = findInvalidActionKeysForModules(allowedActionKeys, allowedModuleSlugs);
      if (invalidActionKeys.length) {
        return NextResponse.json(
          {
            ok: false,
            message: `Action keys must match allowed modules. Invalid keys: ${invalidActionKeys.join(", ")}`
          },
          { status: 400 }
        );
      }
    }

    const created = await prisma.user.create({
      data: {
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        passwordHash: hashPassword(payload.password.trim()),
        role: payload.role,
        isActive: true,
        hasCustomModuleAccess,
        allowedModuleSlugs,
        hasCustomActionAccess,
        allowedActionKeys
      }
    });

    await createAuditLog({
      userId: user.id,
      module: "USER_MANAGEMENT",
      action: "CREATE_USER",
      metadata: {
        createdUserId: created.id,
        createdUserEmail: created.email,
        role: created.role,
        hasCustomModuleAccess: created.hasCustomModuleAccess,
        allowedModuleSlugs: created.allowedModuleSlugs,
        hasCustomActionAccess: created.hasCustomActionAccess,
        allowedActionKeys: created.allowedActionKeys
      }
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
        isActive: created.isActive,
        hasCustomModuleAccess: created.hasCustomModuleAccess,
        allowedModuleSlugs: created.allowedModuleSlugs,
        hasCustomActionAccess: created.hasCustomActionAccess,
        allowedActionKeys: created.allowedActionKeys
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to create user"
      },
      { status: 400 }
    );
  }
}
