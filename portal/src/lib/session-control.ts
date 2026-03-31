import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

type SessionControlStore = {
  invalidBeforeByUserId: Record<string, string>;
  updatedAt: string | null;
};

const sessionControlPath = path.join(process.cwd(), "data", "session-control.json");

async function readStore(): Promise<SessionControlStore> {
  try {
    const raw = await readFile(sessionControlPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<SessionControlStore>;
    return {
      invalidBeforeByUserId:
        parsed.invalidBeforeByUserId && typeof parsed.invalidBeforeByUserId === "object" ? parsed.invalidBeforeByUserId : {},
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch {
    return {
      invalidBeforeByUserId: {},
      updatedAt: null
    };
  }
}

async function saveStore(store: SessionControlStore) {
  await mkdir(path.dirname(sessionControlPath), { recursive: true });
  await writeFile(sessionControlPath, JSON.stringify(store, null, 2), "utf8");
}

export async function forceLogoutUserSessions(userId: string) {
  const store = await readStore();
  store.invalidBeforeByUserId[userId] = new Date().toISOString();
  store.updatedAt = new Date().toISOString();
  await saveStore(store);
  return store.invalidBeforeByUserId[userId];
}

export async function getUserInvalidBefore(userId: string) {
  const store = await readStore();
  return store.invalidBeforeByUserId[userId] || null;
}
