import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { findInvalidActionKeysForModules } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/services/audit-service";
import { createStoredRolePreset, deleteStoredRolePreset, listStoredRolePresets, updateStoredRolePreset } from "@/lib/user-role-presets";

export async function GET() {
  const user = await requireUser();

  if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
    return NextResponse.json(
      {
        ok: false,
        message: "You do not have access to role presets"
      },
      { status: 403 }
    );
  }

  const presets = await listStoredRolePresets();
  return NextResponse.json({ ok: true, presets });
}

export async function POST(request: Request) {
  const user = await requireUser();

  if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
    return NextResponse.json(
      {
        ok: false,
        message: "You do not have access to create role presets"
      },
      { status: 403 }
    );
  }

  try {
    const payload = (await request.json()) as {
      label?: string;
      description?: string;
      baseRole?: UserRole;
      moduleSlugs?: string[];
      actionKeys?: string[];
    };

    if (!payload.label?.trim() || !payload.baseRole || !(payload.baseRole in UserRole)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Label and base role are required"
        },
        { status: 400 }
      );
    }
    const moduleSlugs = Array.isArray(payload.moduleSlugs) ? payload.moduleSlugs : [];
    const actionKeys = Array.isArray(payload.actionKeys) ? payload.actionKeys : [];
    const invalidActionKeys = findInvalidActionKeysForModules(actionKeys, moduleSlugs);
    if (invalidActionKeys.length) {
      return NextResponse.json(
        {
          ok: false,
          message: `Action keys must match allowed modules. Invalid keys: ${invalidActionKeys.join(", ")}`
        },
        { status: 400 }
      );
    }

    const preset = await createStoredRolePreset({
      label: payload.label,
      description: payload.description,
      baseRole: payload.baseRole as UserRole,
      moduleSlugs,
      actionKeys
    });

    await createAuditLog({
      userId: user.id,
      module: "USER_MANAGEMENT",
      action: "CREATE_CUSTOM_ROLE_PRESET",
      metadata: {
        presetKey: preset.key,
        presetLabel: preset.label,
        baseRole: preset.baseRole,
        moduleCount: preset.moduleSlugs.length,
        actionCount: preset.actionKeys.length
      }
    });

    return NextResponse.json({ ok: true, preset });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to create role preset"
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await requireUser();

  if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
    return NextResponse.json(
      {
        ok: false,
        message: "You do not have access to delete role presets"
      },
      { status: 403 }
    );
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as { key?: string };
    const key = payload.key?.trim() || "";
    if (!key) {
      return NextResponse.json(
        {
          ok: false,
          message: "Preset key is required"
        },
        { status: 400 }
      );
    }

    const result = await deleteStoredRolePreset(key);
    if (!result.deleted || !result.preset) {
      return NextResponse.json(
        {
          ok: false,
          message: "Role preset not found"
        },
        { status: 404 }
      );
    }

    await createAuditLog({
      userId: user.id,
      module: "USER_MANAGEMENT",
      action: "DELETE_CUSTOM_ROLE_PRESET",
      metadata: {
        presetKey: result.preset.key,
        presetLabel: result.preset.label,
        baseRole: result.preset.baseRole
      }
    });

    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to delete role preset"
      },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await requireUser();

  if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
    return NextResponse.json(
      {
        ok: false,
        message: "You do not have access to update role presets"
      },
      { status: 403 }
    );
  }

  try {
    const payload = (await request.json()) as {
      key?: string;
      label?: string;
      description?: string;
      baseRole?: UserRole;
      moduleSlugs?: string[];
      actionKeys?: string[];
    };

    if (!payload.key?.trim() || !payload.label?.trim() || !payload.baseRole || !(payload.baseRole in UserRole)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Key, label, and base role are required"
        },
        { status: 400 }
      );
    }
    const moduleSlugs = Array.isArray(payload.moduleSlugs) ? payload.moduleSlugs : [];
    const actionKeys = Array.isArray(payload.actionKeys) ? payload.actionKeys : [];
    const invalidActionKeys = findInvalidActionKeysForModules(actionKeys, moduleSlugs);
    if (invalidActionKeys.length) {
      return NextResponse.json(
        {
          ok: false,
          message: `Action keys must match allowed modules. Invalid keys: ${invalidActionKeys.join(", ")}`
        },
        { status: 400 }
      );
    }

    const preset = await updateStoredRolePreset(payload.key, {
      label: payload.label,
      description: payload.description,
      baseRole: payload.baseRole as UserRole,
      moduleSlugs,
      actionKeys
    });

    await createAuditLog({
      userId: user.id,
      module: "USER_MANAGEMENT",
      action: "UPDATE_CUSTOM_ROLE_PRESET",
      metadata: {
        presetKey: preset.key,
        presetLabel: preset.label,
        baseRole: preset.baseRole,
        moduleCount: preset.moduleSlugs.length,
        actionCount: preset.actionKeys.length
      }
    });

    return NextResponse.json({ ok: true, preset });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to update role preset"
      },
      { status: 400 }
    );
  }
}
