import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { tradeUnitCatalog } from "@/lib/constants";

export type AcademicTradeStructure = {
  instituteCode: string;
  tradeCode: string;
  unitCount: number;
  seatsPerUnit: number;
  batchLabels: string[];
  shiftName: string;
};

export type AcademicShift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

export type AcademicStructureConfig = {
  tradeStructures: AcademicTradeStructure[];
  shifts: AcademicShift[];
  updatedAt: string | null;
};

const academicStructurePath = path.join(process.cwd(), "data", "academic-structure-config.json");

function defaultTradeStructures(): AcademicTradeStructure[] {
  return Object.entries(tradeUnitCatalog).map(([key, value]) => {
    const [instituteCode, tradeCode] = key.split("::");
    return {
      instituteCode,
      tradeCode,
      unitCount: value.unitCount,
      seatsPerUnit: value.seatsPerUnit,
      batchLabels: value.unitCount > 1 ? ["A", "B"] : ["A"],
      shiftName: "Morning"
    };
  });
}

function defaultShifts(): AcademicShift[] {
  return [
    { id: "morning", name: "Morning", startTime: "08:00", endTime: "12:00", isActive: true },
    { id: "afternoon", name: "Afternoon", startTime: "12:00", endTime: "16:00", isActive: true }
  ];
}

export function buildDefaultAcademicStructureConfig(): AcademicStructureConfig {
  return {
    tradeStructures: defaultTradeStructures(),
    shifts: defaultShifts(),
    updatedAt: null
  };
}

function normalizeTradeStructure(input: AcademicTradeStructure): AcademicTradeStructure {
  return {
    instituteCode: input.instituteCode.trim().toUpperCase(),
    tradeCode: input.tradeCode.trim().toUpperCase(),
    unitCount: Math.max(1, Math.trunc(Number(input.unitCount) || 1)),
    seatsPerUnit: Math.max(1, Math.trunc(Number(input.seatsPerUnit) || 1)),
    batchLabels: Array.from(
      new Set(
        input.batchLabels
          .map((item) => item.trim())
          .filter(Boolean)
      )
    ),
    shiftName: input.shiftName.trim() || "Morning"
  };
}

function normalizeShift(input: AcademicShift): AcademicShift {
  return {
    id: input.id.trim() || input.name.trim().toLowerCase().replace(/\s+/g, "-"),
    name: input.name.trim() || "Shift",
    startTime: input.startTime.trim() || "08:00",
    endTime: input.endTime.trim() || "12:00",
    isActive: Boolean(input.isActive)
  };
}

export async function readAcademicStructureConfig(): Promise<AcademicStructureConfig> {
  try {
    const raw = await readFile(academicStructurePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AcademicStructureConfig>;
    const fallback = buildDefaultAcademicStructureConfig();

    return {
      tradeStructures: Array.isArray(parsed.tradeStructures)
        ? parsed.tradeStructures.map((item) => normalizeTradeStructure(item as AcademicTradeStructure))
        : fallback.tradeStructures,
      shifts: Array.isArray(parsed.shifts)
        ? parsed.shifts.map((item) => normalizeShift(item as AcademicShift))
        : fallback.shifts,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch {
    return buildDefaultAcademicStructureConfig();
  }
}

export async function saveAcademicStructureConfig(
  input: Omit<AcademicStructureConfig, "updatedAt">
): Promise<AcademicStructureConfig> {
  const payload: AcademicStructureConfig = {
    tradeStructures: input.tradeStructures.map(normalizeTradeStructure),
    shifts: input.shifts.map(normalizeShift),
    updatedAt: new Date().toISOString()
  };

  await mkdir(path.dirname(academicStructurePath), { recursive: true });
  await writeFile(academicStructurePath, JSON.stringify(payload, null, 2), "utf8");

  return payload;
}
