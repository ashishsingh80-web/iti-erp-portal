import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { categoryOptions, qualificationOptions } from "@/lib/constants";
import type { SelectOption } from "@/lib/types";

export type ClassificationMastersConfig = {
  categories: SelectOption[];
  religions: SelectOption[];
  castes: SelectOption[];
  qualifications: SelectOption[];
  updatedAt: string | null;
};

const classificationMastersPath = path.join(process.cwd(), "data", "classification-masters.json");

export function buildDefaultClassificationMasters(): ClassificationMastersConfig {
  return {
    categories: categoryOptions,
    religions: [
      { label: "Hindu", value: "HINDU" },
      { label: "Muslim", value: "MUSLIM" },
      { label: "Sikh", value: "SIKH" },
      { label: "Christian", value: "CHRISTIAN" },
      { label: "Buddhist", value: "BUDDHIST" },
      { label: "Jain", value: "JAIN" },
      { label: "Other", value: "OTHER" }
    ],
    castes: [
      { label: "General", value: "GENERAL" },
      { label: "OBC", value: "OBC" },
      { label: "SC", value: "SC" },
      { label: "ST", value: "ST" },
      { label: "EWS", value: "EWS" },
      { label: "Other", value: "OTHER" }
    ],
    qualifications: [
      ...qualificationOptions,
      { label: "B.Tech / B.E.", value: "BTECH_BE" },
      { label: "Post Graduation", value: "POST_GRADUATION" }
    ],
    updatedAt: null
  };
}

function normalizeOptions(input: SelectOption[]) {
  return input
    .map((item) => ({
      label: item.label.trim(),
      value: item.value.trim().toUpperCase()
    }))
    .filter((item) => item.label && item.value);
}

export async function readClassificationMasters(): Promise<ClassificationMastersConfig> {
  try {
    const raw = await readFile(classificationMastersPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<ClassificationMastersConfig>;
    const fallback = buildDefaultClassificationMasters();

    return {
      categories: Array.isArray(parsed.categories) ? normalizeOptions(parsed.categories) : fallback.categories,
      religions: Array.isArray(parsed.religions) ? normalizeOptions(parsed.religions) : fallback.religions,
      castes: Array.isArray(parsed.castes) ? normalizeOptions(parsed.castes) : fallback.castes,
      qualifications: Array.isArray(parsed.qualifications) ? normalizeOptions(parsed.qualifications) : fallback.qualifications,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch {
    return buildDefaultClassificationMasters();
  }
}

export async function saveClassificationMasters(
  input: Omit<ClassificationMastersConfig, "updatedAt">
): Promise<ClassificationMastersConfig> {
  const payload: ClassificationMastersConfig = {
    categories: normalizeOptions(input.categories),
    religions: normalizeOptions(input.religions),
    castes: normalizeOptions(input.castes),
    qualifications: normalizeOptions(input.qualifications),
    updatedAt: new Date().toISOString()
  };

  await mkdir(path.dirname(classificationMastersPath), { recursive: true });
  await writeFile(classificationMastersPath, JSON.stringify(payload, null, 2), "utf8");

  return payload;
}
