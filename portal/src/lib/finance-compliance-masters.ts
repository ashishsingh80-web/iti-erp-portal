import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { SelectOption } from "@/lib/types";

export type FinanceComplianceMastersConfig = {
  feeHeads: SelectOption[];
  scholarshipSchemes: SelectOption[];
  documentTypes: SelectOption[];
  updatedAt: string | null;
};

const financeComplianceMastersPath = path.join(process.cwd(), "data", "finance-compliance-masters.json");

export function buildDefaultFinanceComplianceMasters(): FinanceComplianceMastersConfig {
  return {
    feeHeads: [
      { label: "Admission Fee", value: "ADMISSION_FEE" },
      { label: "Tuition Fee", value: "TUITION_FEE" },
      { label: "Exam Fee", value: "EXAM_FEE" },
      { label: "Practical Fee", value: "PRACTICAL_FEE" },
      { label: "Workshop Fee", value: "WORKSHOP_FEE" },
      { label: "Library Fee", value: "LIBRARY_FEE" },
      { label: "Uniform Fee", value: "UNIFORM_FEE" },
      { label: "Other Fee", value: "OTHER_FEE" }
    ],
    scholarshipSchemes: [
      { label: "UP Scholarship", value: "UP_SCHOLARSHIP" },
      { label: "SC Scholarship", value: "SC_SCHOLARSHIP" },
      { label: "ST Scholarship", value: "ST_SCHOLARSHIP" },
      { label: "OBC Scholarship", value: "OBC_SCHOLARSHIP" },
      { label: "Minority Scholarship", value: "MINORITY_SCHOLARSHIP" },
      { label: "EWS Scholarship", value: "EWS_SCHOLARSHIP" },
      { label: "Other Scheme", value: "OTHER_SCHEME" }
    ],
    documentTypes: [
      { label: "Student Aadhaar", value: "STUDENT_AADHAAR" },
      { label: "Parent Aadhaar", value: "PARENT_AADHAAR" },
      { label: "10th Marksheet", value: "TENTH_MARKSHEET" },
      { label: "Student Photo", value: "STUDENT_PHOTO" },
      { label: "Caste Certificate", value: "CASTE_CERTIFICATE" },
      { label: "Income Certificate", value: "INCOME_CERTIFICATE" },
      { label: "Bank Passbook", value: "BANK_PASSBOOK" },
      { label: "Signed Undertaking", value: "SIGNED_UNDERTAKING" },
      { label: "Other", value: "OTHER" }
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

export async function readFinanceComplianceMasters(): Promise<FinanceComplianceMastersConfig> {
  try {
    const raw = await readFile(financeComplianceMastersPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<FinanceComplianceMastersConfig>;
    const fallback = buildDefaultFinanceComplianceMasters();

    return {
      feeHeads: Array.isArray(parsed.feeHeads) ? normalizeOptions(parsed.feeHeads) : fallback.feeHeads,
      scholarshipSchemes: Array.isArray(parsed.scholarshipSchemes)
        ? normalizeOptions(parsed.scholarshipSchemes)
        : fallback.scholarshipSchemes,
      documentTypes: Array.isArray(parsed.documentTypes) ? normalizeOptions(parsed.documentTypes) : fallback.documentTypes,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch {
    return buildDefaultFinanceComplianceMasters();
  }
}

export async function saveFinanceComplianceMasters(
  input: Omit<FinanceComplianceMastersConfig, "updatedAt">
): Promise<FinanceComplianceMastersConfig> {
  const payload: FinanceComplianceMastersConfig = {
    feeHeads: normalizeOptions(input.feeHeads),
    scholarshipSchemes: normalizeOptions(input.scholarshipSchemes),
    documentTypes: normalizeOptions(input.documentTypes),
    updatedAt: new Date().toISOString()
  };

  await mkdir(path.dirname(financeComplianceMastersPath), { recursive: true });
  await writeFile(financeComplianceMastersPath, JSON.stringify(payload, null, 2), "utf8");

  return payload;
}
