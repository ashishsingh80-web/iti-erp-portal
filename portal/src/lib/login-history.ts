import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

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

type LoginHistoryStore = {
  entries: LoginHistoryEntry[];
  lockouts: Record<string, LoginLockState>;
  updatedAt: string | null;
};

const loginHistoryPath = path.join(process.cwd(), "data", "login-history.json");

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

async function readStore(): Promise<LoginHistoryStore> {
  try {
    const raw = await readFile(loginHistoryPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<LoginHistoryStore>;
    return {
      entries: Array.isArray(parsed.entries) ? (parsed.entries as LoginHistoryEntry[]) : [],
      lockouts:
        parsed.lockouts && typeof parsed.lockouts === "object" ? (parsed.lockouts as Record<string, LoginLockState>) : {},
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch {
    return { entries: [], lockouts: {}, updatedAt: null };
  }
}

async function saveStore(entries: LoginHistoryEntry[], lockouts: Record<string, LoginLockState>) {
  const payload: LoginHistoryStore = {
    entries,
    lockouts,
    updatedAt: new Date().toISOString()
  };
  await mkdir(path.dirname(loginHistoryPath), { recursive: true });
  await writeFile(loginHistoryPath, JSON.stringify(payload, null, 2), "utf8");
  return payload;
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
  const store = await readStore();
  const entry: LoginHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    eventType: input.eventType,
    userId: input.userId?.trim() || "",
    userName: input.userName?.trim() || "",
    userEmail: input.userEmail.trim().toLowerCase(),
    userRole: input.userRole?.trim() || "",
    ipAddress: input.ipAddress?.trim() || "",
    userAgent: input.userAgent?.trim() || "",
    deviceLabel: inferDeviceLabel(input.userAgent || ""),
    createdAt: new Date().toISOString()
  };

  const entries = [entry, ...store.entries].slice(0, 500);
  await saveStore(entries, store.lockouts);
  return entry;
}

export async function listLoginHistory(filters: { search?: string; userId?: string; limit?: number } = {}) {
  const store = await readStore();
  const search = filters.search?.trim().toLowerCase() || "";

  return store.entries
    .filter((entry) => (filters.userId ? entry.userId === filters.userId : true))
    .filter((entry) => {
      if (!search) return true;
      return (
        entry.userName.toLowerCase().includes(search) ||
        entry.userEmail.toLowerCase().includes(search) ||
        entry.userRole.toLowerCase().includes(search) ||
        entry.eventType.toLowerCase().includes(search) ||
        entry.ipAddress.toLowerCase().includes(search) ||
        entry.deviceLabel.toLowerCase().includes(search)
      );
    })
    .slice(0, filters.limit || 100);
}

export async function clearFailedLoginAttempts(filters: { userId?: string; userEmail?: string }) {
  const store = await readStore();
  const targetEmail = filters.userEmail?.trim().toLowerCase() || "";
  let removedCount = 0;

  const entries = store.entries.filter((entry) => {
    const matchesUserId = filters.userId ? entry.userId === filters.userId : false;
    const matchesUserEmail = targetEmail ? entry.userEmail === targetEmail : false;
    const shouldClear = entry.eventType === "LOGIN_FAILED" && (matchesUserId || matchesUserEmail);

    if (shouldClear) {
      removedCount += 1;
      return false;
    }

    return true;
  });

  const nextLockouts = { ...store.lockouts };
  if (targetEmail && nextLockouts[targetEmail]) {
    nextLockouts[targetEmail] = {
      failedAttempts: 0,
      lockedUntil: null,
      lockType: undefined,
      reason: null,
      updatedAt: new Date().toISOString()
    };
  }

  if (removedCount > 0 || (targetEmail && store.lockouts[targetEmail])) {
    await saveStore(entries, nextLockouts);
  }

  return { removedCount };
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 1000 * 60 * 30;

export async function getLoginLockouts() {
  const store = await readStore();
  return store.lockouts;
}

export async function getLoginLockState(userEmail: string) {
  const store = await readStore();
  const email = userEmail.trim().toLowerCase();
  const state = store.lockouts[email];
  if (!state) return null;

  if (state.lockedUntil && new Date(state.lockedUntil).getTime() <= Date.now()) {
    const nextLockouts = {
      ...store.lockouts,
      [email]: {
        failedAttempts: 0,
        lockedUntil: null,
        lockType: undefined,
        reason: null,
        updatedAt: new Date().toISOString()
      }
    };
    await saveStore(store.entries, nextLockouts);
    return nextLockouts[email];
  }

  return state;
}

export async function registerFailedLoginAttempt(input: {
  userId?: string | null;
  userName?: string | null;
  userEmail: string;
  userRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const store = await readStore();
  const email = input.userEmail.trim().toLowerCase();
  const entry: LoginHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    eventType: "LOGIN_FAILED",
    userId: input.userId?.trim() || "",
    userName: input.userName?.trim() || "",
    userEmail: email,
    userRole: input.userRole?.trim() || "",
    ipAddress: input.ipAddress?.trim() || "",
    userAgent: input.userAgent?.trim() || "",
    deviceLabel: inferDeviceLabel(input.userAgent || ""),
    createdAt: new Date().toISOString()
  };

  const previous = store.lockouts[email] || {
    failedAttempts: 0,
    lockedUntil: null,
    lockType: undefined,
    reason: null,
    updatedAt: new Date().toISOString()
  };
  const failedAttempts = previous.failedAttempts + 1;
  const lockedUntil = failedAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_WINDOW_MS).toISOString() : null;
  const lockType: LoginLockState["lockType"] = lockedUntil ? "AUTO" : undefined;
  const nextLockouts = {
    ...store.lockouts,
    [email]: {
      failedAttempts,
      lockedUntil,
      lockType,
      reason: lockedUntil ? "Repeated failed login attempts" : null,
      updatedAt: new Date().toISOString()
    }
  };
  const entries = [entry, ...store.entries].slice(0, 500);
  await saveStore(entries, nextLockouts);
  return { entry, lockState: nextLockouts[email] };
}

export async function registerSuccessfulLogin(input: {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const store = await readStore();
  const email = input.userEmail.trim().toLowerCase();
  const entry: LoginHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    eventType: "LOGIN_SUCCESS",
    userId: input.userId,
    userName: input.userName,
    userEmail: email,
    userRole: input.userRole,
    ipAddress: input.ipAddress?.trim() || "",
    userAgent: input.userAgent?.trim() || "",
    deviceLabel: inferDeviceLabel(input.userAgent || ""),
    createdAt: new Date().toISOString()
  };

  const entries = [entry, ...store.entries].slice(0, 500);
  const nextLockouts = {
    ...store.lockouts,
    [email]: {
      failedAttempts: 0,
      lockedUntil: null,
      lockType: undefined,
      reason: null,
      updatedAt: new Date().toISOString()
    }
  };
  await saveStore(entries, nextLockouts);
  return entry;
}

export async function unlockLoginAccount(filters: { userEmail: string }) {
  const store = await readStore();
  const email = filters.userEmail.trim().toLowerCase();
  const current = store.lockouts[email];
  if (!current) {
    return { unlocked: false };
  }

  const nextLockouts = {
    ...store.lockouts,
    [email]: {
      failedAttempts: 0,
      lockedUntil: null,
      lockType: undefined,
      reason: null,
      updatedAt: new Date().toISOString()
    }
  };
  await saveStore(store.entries, nextLockouts);
  return { unlocked: true };
}

export async function lockLoginAccount(filters: { userEmail: string; reason?: string | null }) {
  const store = await readStore();
  const email = filters.userEmail.trim().toLowerCase();
  const nextLockouts = {
    ...store.lockouts,
    [email]: {
      failedAttempts: Math.max(store.lockouts[email]?.failedAttempts || 0, MAX_FAILED_ATTEMPTS),
      lockedUntil: new Date(Date.now() + LOCK_WINDOW_MS).toISOString(),
      lockType: "MANUAL" as const,
      reason: filters.reason?.trim() || "Locked by administrator",
      updatedAt: new Date().toISOString()
    }
  };
  await saveStore(store.entries, nextLockouts);
  return { locked: true, lockState: nextLockouts[email] };
}
