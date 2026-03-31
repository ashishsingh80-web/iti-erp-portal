import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type InstituteBrandingRow = {
  instituteCode: string;
  campusName: string;
  contactPhone: string;
  contactEmail: string;
  website: string;
  principalName: string;
  ncvtCode: string;
  affiliationNumber: string;
  affiliationValidFrom: string;
  affiliationValidTo: string;
  logoUrl: string;
  sealUrl: string;
  signatureUrl: string;
  signatureLabel: string;
  certificateFooterText: string;
  receiptHeaderText: string;
};

export type InstituteBrandingConfig = {
  institutes: InstituteBrandingRow[];
  updatedAt: string | null;
};

const instituteBrandingPath = path.join(process.cwd(), "data", "institute-branding-config.json");

function normalizeRow(input: InstituteBrandingRow): InstituteBrandingRow {
  return {
    instituteCode: input.instituteCode.trim().toUpperCase(),
    campusName: input.campusName.trim(),
    contactPhone: input.contactPhone.trim(),
    contactEmail: input.contactEmail.trim(),
    website: input.website.trim(),
    principalName: input.principalName.trim(),
    ncvtCode: input.ncvtCode.trim(),
    affiliationNumber: input.affiliationNumber.trim(),
    affiliationValidFrom: input.affiliationValidFrom.trim(),
    affiliationValidTo: input.affiliationValidTo.trim(),
    logoUrl: input.logoUrl.trim(),
    sealUrl: input.sealUrl.trim(),
    signatureUrl: input.signatureUrl.trim(),
    signatureLabel: input.signatureLabel.trim(),
    certificateFooterText: input.certificateFooterText.trim(),
    receiptHeaderText: input.receiptHeaderText.trim()
  };
}

export function buildDefaultInstituteBrandingConfig(): InstituteBrandingConfig {
  return {
    institutes: [],
    updatedAt: null
  };
}

export async function readInstituteBrandingConfig(): Promise<InstituteBrandingConfig> {
  try {
    const raw = await readFile(instituteBrandingPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<InstituteBrandingConfig>;
    return {
      institutes: Array.isArray(parsed.institutes)
        ? parsed.institutes.map((item) => normalizeRow(item as InstituteBrandingRow))
        : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch {
    return buildDefaultInstituteBrandingConfig();
  }
}

export async function saveInstituteBrandingConfig(
  input: Omit<InstituteBrandingConfig, "updatedAt">
): Promise<InstituteBrandingConfig> {
  const payload: InstituteBrandingConfig = {
    institutes: input.institutes.map(normalizeRow),
    updatedAt: new Date().toISOString()
  };

  await mkdir(path.dirname(instituteBrandingPath), { recursive: true });
  await writeFile(instituteBrandingPath, JSON.stringify(payload, null, 2), "utf8");

  return payload;
}

export async function getInstituteBrandingByCode(instituteCode: string) {
  const config = await readInstituteBrandingConfig();
  return config.institutes.find((item) => item.instituteCode === instituteCode.trim().toUpperCase()) || null;
}
