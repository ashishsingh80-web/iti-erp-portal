import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { hashPassword, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/audit-service";
import { forceLogoutUserSessions } from "@/lib/session-control";

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const currentUser = await requireUser();

  if (!["SUPER_ADMIN", "ADMIN"].includes(currentUser.role)) {
    return NextResponse.json(
      {
        ok: false,
        message: "You do not have access to update users"
      },
      { status: 403 }
    );
  }

  try {
    const { userId } = await context.params;
    const payload = (await request.json()) as {
      role?: string;
      hasCustomModuleAccess?: boolean;
      allowedModuleSlugs?: string[];
      hasCustomActionAccess?: boolean;
      allowedActionKeys?: string[];
      isActive?: boolean;
      password?: string;
      forceLogout?: boolean;
    };

    const existing = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existing) {
      return NextResponse.json(
        {
          ok: false,
          message: "User not found"
        },
        { status: 404 }
      );
    }

    const nextRole =
      typeof payload.role === "string" && payload.role in UserRole ? (payload.role as UserRole) : undefined;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(nextRole ? { role: nextRole } : {}),
        hasCustomModuleAccess: Boolean(payload.hasCustomModuleAccess),
        allowedModuleSlugs: payload.allowedModuleSlugs || [],
        hasCustomActionAccess: Boolean(payload.hasCustomActionAccess),
        allowedActionKeys: payload.allowedActionKeys || [],
        ...(typeof payload.isActive === "boolean" ? { isActive: payload.isActive } : {}),
        ...(payload.password?.trim() ? { passwordHash: hashPassword(payload.password.trim()) } : {})
      }
    });

    let forcedLogoutAt: string | null = null;
    if (payload.forceLogout) {
      forcedLogoutAt = await forceLogoutUserSessions(updated.id);
    }

    await createAuditLog({
      userId: currentUser.id,
      module: "USER_MANAGEMENT",
      action: payload.forceLogout ? "FORCE_LOGOUT_USER" : payload.password?.trim() ? "RESET_USER_PASSWORD" : "UPDATE_USER_ACCESS",
      metadata: {
        targetUserId: updated.id,
        targetUserEmail: updated.email,
        before: {
          role: existing.role,
          isActive: existing.isActive,
          hasCustomModuleAccess: existing.hasCustomModuleAccess,
          allowedModuleSlugs: existing.allowedModuleSlugs,
          hasCustomActionAccess: existing.hasCustomActionAccess,
          allowedActionKeys: existing.allowedActionKeys
        },
        after: {
          role: updated.role,
          isActive: updated.isActive,
          hasCustomModuleAccess: updated.hasCustomModuleAccess,
          allowedModuleSlugs: updated.allowedModuleSlugs,
          hasCustomActionAccess: updated.hasCustomActionAccess,
          allowedActionKeys: updated.allowedActionKeys
        },
        passwordChanged: Boolean(payload.password?.trim()),
        forcedLogoutAt
      }
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive,
        hasCustomModuleAccess: updated.hasCustomModuleAccess,
        allowedModuleSlugs: updated.allowedModuleSlugs,
        hasCustomActionAccess: updated.hasCustomActionAccess,
        allowedActionKeys: updated.allowedActionKeys
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to update user"
      },
      { status: 400 }
    );
  }
}
