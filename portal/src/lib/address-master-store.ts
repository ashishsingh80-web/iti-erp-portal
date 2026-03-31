import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  baseAddressHierarchy,
  getAddressHierarchyStats,
  indiaStateOptions,
  mergeAddressHierarchies,
  type StateMap
} from "@/lib/address-masters";

export type AddressMasterConfig = {
  hierarchy: StateMap;
  updatedAt: string | null;
};

const addressMasterPath = path.join(process.cwd(), "data", "address-masters.json");

function normalizeHierarchy(raw: unknown): StateMap {
  if (!raw || typeof raw !== "object") return {};
  return raw as StateMap;
}

export async function readAddressMasterConfig(): Promise<AddressMasterConfig> {
  try {
    const raw = await readFile(addressMasterPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AddressMasterConfig>;
    return {
      hierarchy: normalizeHierarchy(parsed.hierarchy),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch {
    return {
      hierarchy: {},
      updatedAt: null
    };
  }
}

export async function saveAddressMasterConfig(hierarchy: StateMap) {
  const payload: AddressMasterConfig = {
    hierarchy,
    updatedAt: new Date().toISOString()
  };

  await mkdir(path.dirname(addressMasterPath), { recursive: true });
  await writeFile(addressMasterPath, JSON.stringify(payload, null, 2), "utf8");

  return payload;
}

export async function getMergedAddressMasterData() {
  const config = await readAddressMasterConfig();
  const hierarchy = mergeAddressHierarchies(baseAddressHierarchy, config.hierarchy);

  return {
    stateOptions: indiaStateOptions,
    hierarchy,
    stats: getAddressHierarchyStats(hierarchy),
    updatedAt: config.updatedAt
  };
}
