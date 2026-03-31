import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { UserRole } from "@prisma/client";

export type StoredRolePreset = {
  key: string;
  label: string;
  description: string;
  baseRole: UserRole;
  moduleSlugs: string[];
  actionKeys: string[];
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
};

type StoreShape = {
  presets: StoredRolePreset[];
  updatedAt: string | null;
};

const presetsPath = path.join(process.cwd(), "data", "user-role-presets.json");

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await readFile(presetsPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      presets: Array.isArray(parsed.presets) ? (parsed.presets as StoredRolePreset[]) : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch {
    return { presets: [], updatedAt: null };
  }
}

async function saveStore(presets: StoredRolePreset[]) {
  const payload: StoreShape = {
    presets,
    updatedAt: new Date().toISOString()
  };
  await mkdir(path.dirname(presetsPath), { recursive: true });
  await writeFile(presetsPath, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

function toKey(label: string) {
  return `CUSTOM_${label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")}`;
}

export async function listStoredRolePresets() {
  const store = await readStore();
  return store.presets.sort((left, right) => left.label.localeCompare(right.label));
}

export async function createStoredRolePreset(input: {
  label: string;
  description?: string;
  baseRole: UserRole;
  moduleSlugs: string[];
  actionKeys: string[];
}) {
  const store = await readStore();
  const label = input.label.trim();
  if (!label) {
    throw new Error("Role preset label is required");
  }

  const keyBase = toKey(label);
  let key = keyBase;
  let counter = 2;
  while (store.presets.some((item) => item.key === key)) {
    key = `${keyBase}_${counter}`;
    counter += 1;
  }

  const preset: StoredRolePreset = {
    key,
    label,
    description: input.description?.trim() || "Custom role preset",
    baseRole: input.baseRole,
    moduleSlugs: [...new Set(input.moduleSlugs)],
    actionKeys: [...new Set(input.actionKeys)],
    isCustom: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await saveStore([preset, ...store.presets]);
  return preset;
}

export async function deleteStoredRolePreset(key: string) {
  const store = await readStore();
  const targetKey = key.trim();
  const existing = store.presets.find((item) => item.key === targetKey);
  if (!existing) {
    return { deleted: false, preset: null };
  }

  const nextPresets = store.presets.filter((item) => item.key !== targetKey);
  await saveStore(nextPresets);
  return { deleted: true, preset: existing };
}

export async function updateStoredRolePreset(
  key: string,
  input: {
    label: string;
    description?: string;
    baseRole: UserRole;
    moduleSlugs: string[];
    actionKeys: string[];
  }
) {
  const store = await readStore();
  const targetKey = key.trim();
  const existing = store.presets.find((item) => item.key === targetKey);
  if (!existing) {
    throw new Error("Role preset not found");
  }

  const updated: StoredRolePreset = {
    ...existing,
    label: input.label.trim(),
    description: input.description?.trim() || "Custom role preset",
    baseRole: input.baseRole,
    moduleSlugs: [...new Set(input.moduleSlugs)],
    actionKeys: [...new Set(input.actionKeys)],
    updatedAt: new Date().toISOString()
  };

  const nextPresets = store.presets.map((item) => (item.key === targetKey ? updated : item));
  await saveStore(nextPresets);
  return updated;
}
