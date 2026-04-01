import type { PortalLoginHistory, PortalLoginLockout } from "@prisma/client";
import { PortalLoginHistoryEventType, PortalLoginLockType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type LoginHistoryEntry = {
  id: string;
  eventType: "LOGIN_SUCCESS" | "LOGIN_FAILED" | "LOGOUT";
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  ipAddress: string;
  userAgent: string;
  deviceLabel: string;
  createdAt: string;
};

export type LoginLockState = {
  failedAttempts: number;
  lockedUntil: string | null;
  lockType?: "AUTO" | "MANUAL";
  reason?: string | null;
  updatedAt: string;
};

const MAX_ENTRIES = 500;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 1000 * 60 * 30;

function inferDeviceLabel(userAgent: string) {
  const agent = userAgent.toLowerCase();
  if (!agent) return "Unknown Device";
  if (agent.includes("iphone")) return "iPhone";
  if (agent.includes("ipad")) return "iPad";
  if (agent.includes("android")) return "Android Device";
  if (agent.includes("mac os") || agent.includes("macintosh")) return "Mac";
  if (agent.includes("windows")) return "Windows PC";
  if (agent.includes("linux")) return "Linux Device";
  return "Browser Device";
}

function rowToEntry(row: PortalLoginHistory): LoginHistoryEntry {
  return {
    id: row.id,
    eventType: row.eventType as LoginHistoryEntry["eventType"],
    userId: row.userId,
    userName: row.userName,
    userEmail: row.userEmail,
    userRole: row.userRole,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    deviceLabel: row.deviceLabel,
    createdAt: row.createdAt.toISOString()
  };
}

function rowToLockState(row: PortalLoginLockout): LoginLockState {
  return {
    failedAttempts: row.failedAttempts,
    lockedUntil: row.lockedUntil ? row.lockedUntil.toISOString() : null,
    lockType: row.lockType ?? undefined,
    reason: row.reason,
    updatedAt: row.updatedAt.toISOString()
  };
}

function clearedLockState() {
  return {
    failedAttempts: 0,
    lockedUntil: null as Date | null,
    lockType: null as PortalLoginLockType | null,
    reason: null as string | null,
    updatedAt: new Date()
  };
}

async function pruneOldHistory() {
  const count = await prisma.portalLoginHistory.count();
  if (count <= MAX_ENTRIES) return;
  const toDelete = count - MAX_ENTRIES;
  const oldest = await prisma.portalLoginHistory.findMany({
    orderBy: { createdAt: "asc" },
    take: toDelete,
    select: { id: true }
  });
  if (oldest.length === 0) return;
  await prisma.portalLoginHistory.deleteMany({ where: { id: { in: oldest.map((o) => o.id) } } });
}

export async function appendLoginHistory(input: {
  eventType: LoginHistoryEntry["eventType"];
  userId?: string | null;
  userName?: string | null;
  userEmail: string;
  userRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const ua = input.userAgent?.trim() || "";
  const row = await prisma.portalLoginHistory.create({
    data: {
      eventType: input.eventType as PortalLoginHistoryEventType,
      userId: input.userId?.trim() || "",
      userName: input.userName?.trim() || "",
      userEmail: input.userEmail.trim().toLowerCase(),
      userRole: input.userRole?.trim() || "",
      ipAddress: input.ipAddress?.trim() || "",
      userAgent: ua,
      deviceLabel: inferDeviceLabel(ua)
    }
  });
  await pruneOldHistory();
  return rowToEntry(row);
}

export async function listLoginHistory(filters: { search?: string; userId?: string; limit?: number } = {}) {
  const search = filters.search?.trim().toLowerCase() || "";
  const limit = Math.min(filters.limit || 100, 500);

  const take = search ? MAX_ENTRIES : limit;

  const rows = await prisma.portalLoginHistory.findMany({
    where: filters.userId ? { userId: filters.userId } : undefined,
    orderBy: { createdAt: "desc" },
    take
  });

  const mapped = rows.map(rowToEntry).filter((entry) => {
    if (!search) return true;
    return (
      entry.userName.toLowerCase().includes(search) ||
      entry.userEmail.toLowerCase().includes(search) ||
      entry.userRole.toLowerCase().includes(search) ||
      entry.eventType.toLowerCase().includes(search) ||
      entry.ipAddress.toLowerCase().includes(search) ||
      entry.deviceLabel.toLowerCase().includes(search)
    );
  });

  return mapped.slice(0, limit);
}

export async function clearFailedLoginAttempts(filters: { userId?: string; userEmail?: string }) {
  const targetEmail = filters.userEmail?.trim().toLowerCase() || "";
  const or: Array<{ userId: string } | { userEmail: string }> = [];
  if (filters.userId) or.push({ userId: filters.userId });
  if (targetEmail) or.push({ userEmail: targetEmail });

  let removedCount = 0;
  if (or.length > 0) {
    const deleted = await prisma.portalLoginHistory.deleteMany({
      where: {
        eventType: PortalLoginHistoryEventType.LOGIN_FAILED,
        OR: or
      }
    });
    removedCount = deleted.count;
  }

  if (targetEmail) {
    await prisma.portalLoginLockout.upsert({
      where: { userEmail: targetEmail },
      create: {
        userEmail: targetEmail,
        ...clearedLockState()
      },
      update: clearedLockState()
    });
  }

  return { removedCount };
}

export async function getLoginLockouts() {
  const rows = await prisma.portalLoginLockout.findMany();
  const out: Record<string, LoginLockState> = {};
  for (const row of rows) {
    out[row.userEmail] = rowToLockState(row);
  }
  return out;
}

export async function getLoginLockState(userEmail: string) {
  const email = userEmail.trim().toLowerCase();
  const row = await prisma.portalLoginLockout.findUnique({ where: { userEmail: email } });
  if (!row) return null;

  if (row.lockedUntil && row.lockedUntil.getTime() <= Date.now()) {
    const updated = await prisma.portalLoginLockout.update({
      where: { userEmail: email },
      data: clearedLockState()
    });
    return rowToLockState(updated);
  }

  return rowToLockState(row);
}

export async function registerFailedLoginAttempt(input: {
  userId?: string | null;
  userName?: string | null;
  userEmail: string;
  userRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const ua = input.userAgent?.trim() || "";
  const email = input.userEmail.trim().toLowerCase();

  const entryRow = await prisma.$transaction(async (tx) => {
    const row = await tx.portalLoginHistory.create({
      data: {
        eventType: PortalLoginHistoryEventType.LOGIN_FAILED,
        userId: input.userId?.trim() || "",
        userName: input.userName?.trim() || "",
        userEmail: email,
        userRole: input.userRole?.trim() || "",
        ipAddress: input.ipAddress?.trim() || "",
        userAgent: ua,
        deviceLabel: inferDeviceLabel(ua)
      }
    });

    const previous = await tx.portalLoginLockout.findUnique({ where: { userEmail: email } });
    const failedAttempts = (previous?.failedAttempts ?? 0) + 1;
    const lockedUntil =
      failedAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_WINDOW_MS) : null;
    const lockType: PortalLoginLockType | null = lockedUntil ? PortalLoginLockType.AUTO : null;

    await tx.portalLoginLockout.upsert({
      where: { userEmail: email },
      create: {
        userEmail: email,
        failedAttempts,
        lockedUntil,
        lockType,
        reason: lockedUntil ? "Repeated failed login attempts" : null
      },
      update: {
        failedAttempts,
        lockedUntil,
        lockType,
        reason: lockedUntil ? "Repeated failed login attempts" : null
      }
    });

    return row;
  });

  await pruneOldHistory();

  const lockRow = await prisma.portalLoginLockout.findUniqueOrThrow({ where: { userEmail: email } });
  return { entry: rowToEntry(entryRow), lockState: rowToLockState(lockRow) };
}

export async function registerSuccessfulLogin(input: {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const ua = input.userAgent?.trim() || "";
  const email = input.userEmail.trim().toLowerCase();

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.portalLoginHistory.create({
      data: {
        eventType: PortalLoginHistoryEventType.LOGIN_SUCCESS,
        userId: input.userId,
        userName: input.userName,
        userEmail: email,
        userRole: input.userRole,
        ipAddress: input.ipAddress?.trim() || "",
        userAgent: ua,
        deviceLabel: inferDeviceLabel(ua)
      }
    });

    await tx.portalLoginLockout.upsert({
      where: { userEmail: email },
      create: {
        userEmail: email,
        failedAttempts: 0,
        lockedUntil: null,
        lockType: null,
        reason: null
      },
      update: {
        failedAttempts: 0,
        lockedUntil: null,
        lockType: null,
        reason: null
      }
    });

    return created;
  });

  await pruneOldHistory();
  return rowToEntry(row);
}

export async function unlockLoginAccount(filters: { userEmail: string }) {
  const email = filters.userEmail.trim().toLowerCase();
  const existing = await prisma.portalLoginLockout.findUnique({ where: { userEmail: email } });
  if (!existing) {
    return { unlocked: false };
  }

  await prisma.portalLoginLockout.update({
    where: { userEmail: email },
    data: clearedLockState()
  });
  return { unlocked: true };
}

export async function lockLoginAccount(filters: { userEmail: string; reason?: string | null }) {
  const email = filters.userEmail.trim().toLowerCase();
  const prev = await prisma.portalLoginLockout.findUnique({ where: { userEmail: email } });
  const failedFloor = Math.max(prev?.failedAttempts ?? 0, MAX_FAILED_ATTEMPTS);

  const updated = await prisma.portalLoginLockout.upsert({
    where: { userEmail: email },
    create: {
      userEmail: email,
      failedAttempts: failedFloor,
      lockedUntil: new Date(Date.now() + LOCK_WINDOW_MS),
      lockType: PortalLoginLockType.MANUAL,
      reason: filters.reason?.trim() || "Locked by administrator"
    },
    update: {
      failedAttempts: failedFloor,
      lockedUntil: new Date(Date.now() + LOCK_WINDOW_MS),
      lockType: PortalLoginLockType.MANUAL,
      reason: filters.reason?.trim() || "Locked by administrator"
    }
  });

  return { locked: true, lockState: rowToLockState(updated) };
}
