import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { clearFailedLoginAttempts, getLoginLockouts, listLoginHistory, lockLoginAccount, unlockLoginAccount } from "@/lib/login-history";
import { createAuditLog } from "@/lib/services/audit-service";

export async function GET(request: Request) {
  const user = await requireUser();

  if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
    return NextResponse.json(
      {
        ok: false,
        message: "You do not have access to login history"
      },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const userId = url.searchParams.get("userId") || "";
  const rows = await listLoginHistory({ search, userId, limit: 120 });
  const lockouts = await getLoginLockouts();

  return NextResponse.json({
    ok: true,
    rows,
    lockouts
  });
}

export async function PATCH(request: Request) {
  const user = await requireUser();

  if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
    return NextResponse.json(
      {
        ok: false,
        message: "You do not have access to reset login-history attempts"
      },
      { status: 403 }
    );
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as {
      userId?: string;
      userEmail?: string;
      mode?: "clear_failed_attempts" | "unlock_account" | "lock_account";
      reason?: string;
    };
    const targetUserId = payload.userId?.trim() || "";
    const targetUserEmail = payload.userEmail?.trim().toLowerCase() || "";
    const mode = payload.mode || "clear_failed_attempts";

    if (!targetUserId && !targetUserEmail) {
      return NextResponse.json(
        {
          ok: false,
          message: "User selection is required"
        },
        { status: 400 }
      );
    }

    const result =
      mode === "unlock_account"
        ? await unlockLoginAccount({
            userEmail: targetUserEmail
          })
        : mode === "lock_account"
          ? await lockLoginAccount({
              userEmail: targetUserEmail,
              reason: payload.reason || null
            })
        : await clearFailedLoginAttempts({
            userId: targetUserId || undefined,
            userEmail: targetUserEmail || undefined
          });

    await createAuditLog({
      userId: user.id,
      module: "USER_MANAGEMENT",
      action:
        mode === "unlock_account"
          ? "UNLOCK_USER_LOGIN"
          : mode === "lock_account"
            ? "LOCK_USER_LOGIN"
            : "CLEAR_FAILED_LOGIN_ATTEMPTS",
      metadata: {
        targetUserId: targetUserId || null,
        targetUserEmail: targetUserEmail || null,
        removedCount: "removedCount" in result ? result.removedCount : 0,
        unlocked: "unlocked" in result ? result.unlocked : false,
        locked: "locked" in result ? result.locked : false,
        reason: payload.reason || null
      }
    });

    return NextResponse.json({
      ok: true,
      removedCount: "removedCount" in result ? result.removedCount : 0,
      unlocked: "unlocked" in result ? result.unlocked : false,
      locked: "locked" in result ? result.locked : false
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to clear failed attempts"
      },
      { status: 400 }
    );
  }
}
