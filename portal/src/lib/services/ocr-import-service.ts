import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { ScholarshipStatus, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/audit-service";

export type OcrImportKind = "SCHOLARSHIP" | "PRN" | "SCVT";

type ImportStudent = {
  id: string;
  studentCode: string;
  fullName: string;
  fatherName: string | null;
  mobile: string;
  session: string;
  yearLabel: string;
  instituteCode: string;
  instituteName: string;
  instituteScvtCode: string | null;
  tradeName: string;
  scholarshipId: string | null;
  scholarshipStatus: ScholarshipStatus | null;
  prnNumber: string | null;
  scvtRegistrationNumber: string | null;
};

type OcrHeaderFilters = {
  instituteCode: string;
  instituteName: string;
  instituteScvtCode: string;
  tradeName: string;
};

export type OcrImportPreviewRow = {
  studentId: string;
  studentCode: string;
  fullName: string;
  session: string;
  yearLabel: string;
  tradeName: string;
  matchedBy: string;
  confidence: number;
  canApply: boolean;
  extractedValue: string;
  entRollNumber: string;
  admissionStatus: string;
  currentValue: string;
  extractedStatus: string;
  currentStatus: string;
  creditedAmount: string;
  lineText: string;
};

export type OcrImportPreview = {
  kind: OcrImportKind;
  sourceName: string;
  detectedFilters: Partial<OcrHeaderFilters>;
  rows: OcrImportPreviewRow[];
  summary: {
    parsedLines: number;
    matchedRows: number;
    readyToApply: number;
  };
};

const execFileAsync = promisify(execFile);

function normalizeText(value: string | null | undefined) {
  return (value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 3);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildCandidateTexts(kind: OcrImportKind, text: string) {
  const lines = extractLines(text);

  if (kind !== "SCVT") return lines;

  const candidates: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (/\b\d{15,}\b/.test(lines[index])) {
      const start = Math.max(0, index - 8);
      const end = Math.min(lines.length, index + 2);
      candidates.push(lines.slice(start, end).join(" "));
    }
  }

  return candidates.length ? candidates : lines;
}

function findStatusFromText(text: string, fallback?: ScholarshipStatus) {
  const normalized = normalizeText(text);
  if (/QUERY|OBJECTION|DEFECT/.test(normalized)) return ScholarshipStatus.QUERY_BY_DEPARTMENT;
  if (/REJECT|CANCEL|NOT APPROVED/.test(normalized)) return ScholarshipStatus.REJECTED;
  if (/APPROV|SANCTION|SELECT/.test(normalized)) return ScholarshipStatus.APPROVED;
  if (/UNDER PROCESS|PENDING|VERIFYING/.test(normalized)) return ScholarshipStatus.UNDER_PROCESS;
  if (/APPLIED|SUBMITTED/.test(normalized)) return ScholarshipStatus.APPLIED;
  return fallback || ScholarshipStatus.APPLIED;
}

function extractCreditAmount(text: string) {
  const matches = text.match(/\b\d{3,7}(?:\.\d{1,2})?\b/g) || [];
  const parsed = matches
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item >= 100);
  if (!parsed.length) return "";
  return String(parsed[parsed.length - 1]);
}

function extractRegistrationToken(text: string, kind: OcrImportKind, studentCode: string, mobile: string) {
  const normalized = text.toUpperCase();
  const labelPattern =
    kind === "PRN"
      ? /PRN[^A-Z0-9]*([A-Z0-9/-]{5,})/
      : kind === "SCVT"
        ? /SCVT[^A-Z0-9]*([A-Z0-9/-]{5,})/
        : /(?:SCHOLARSHIP|APPLICATION|REGISTRATION|APP(?:LICATION)?\s*NO|ID)[^A-Z0-9]*([A-Z0-9/-]{5,})/;

  const labelled = normalized.match(labelPattern);
  if (labelled?.[1]) return labelled[1];

  const tokens = normalized.match(/[A-Z0-9][A-Z0-9/-]{5,}/g) || [];
  const blocked = new Set([
    studentCode.toUpperCase(),
    mobile,
    mobile.slice(-10),
    "SCHOLARSHIP",
    "APPLICATION",
    "REGISTRATION"
  ]);
  return tokens.find((token) => !blocked.has(token)) || "";
}

function extractEntRollNumber(text: string) {
  const matches = text.match(/\b\d{9,12}\b/g) || [];
  return matches.find((item) => item.length < 15) || "";
}

function extractScvtAdmissionStatus(text: string) {
  const normalized = normalizeText(text);
  if (normalized.includes("NEW ADMISSION") || normalized.includes("ADMITTED")) return "ADMITTED_NEW_ADMISSION";
  if (normalized.includes("ADMISSION")) return "ADMISSION";
  if (normalized.includes("ALLOTMENT")) return "ALLOTMENT";
  return "";
}

function extractHeaderFilters(text: string) {
  const lines = extractLines(text);
  const headerText = lines.slice(0, Math.min(lines.length, 40)).join(" ");
  const normalizedHeader = normalizeText(headerText);
  const result: Partial<OcrHeaderFilters> = {};

  const scvtCodeMatch = headerText.match(/\[(\d{3,6})\]/);
  if (scvtCodeMatch?.[1]) {
    result.instituteScvtCode = scvtCodeMatch[1];
  }

  const instituteLine = lines.find((line) => /\[\d{3,6}\]/.test(line) || /PRIVATE ITI/i.test(line));
  if (instituteLine) {
    const instituteName = instituteLine.split("[")[0].replace(/\s+-\s+.*$/, "").trim();
    if (instituteName) {
      result.instituteName = instituteName;
    }
  }

  const tradeLine = lines.find((line) => /TRADE/i.test(line));
  if (tradeLine) {
    const tradeMatch = tradeLine.match(/TRADE(?:\s+NAME)?\s*[:\-]?\s*(.+)$/i);
    if (tradeMatch?.[1]) {
      result.tradeName = tradeMatch[1].trim();
    }
  } else {
    const knownTrades = ["ELECTRICIAN", "FITTER", "ELECTRONIC MECHANIC", "DRESS MAKING", "DRESS-MAKING"];
    const knownTrade = knownTrades.find((trade) => normalizedHeader.includes(trade));
    if (knownTrade) {
      result.tradeName = knownTrade.replace("DRESS MAKING", "Dress-Making").replace("DRESS-MAKING", "Dress-Making");
    }
  }

  return result;
}

async function resolveHeaderFilters(text: string) {
  const extracted = extractHeaderFilters(text);
  const institutes = await prisma.institute.findMany({
    where: { status: true },
    select: { instituteCode: true, name: true, scvtCode: true }
  });

  const normalizedName = normalizeText(extracted.instituteName);
  const matchedInstitute = institutes.find((item) => {
    if (extracted.instituteScvtCode && item.scvtCode === extracted.instituteScvtCode) return true;
    if (normalizedName && normalizeText(item.name) === normalizedName) return true;
    return false;
  });

  return {
    instituteCode: matchedInstitute?.instituteCode || "",
    instituteName: matchedInstitute?.name || extracted.instituteName || "",
    instituteScvtCode: matchedInstitute?.scvtCode || extracted.instituteScvtCode || "",
    tradeName: extracted.tradeName || ""
  } satisfies Partial<OcrHeaderFilters>;
}

function findBestStudentForLine(line: string, students: ImportStudent[]) {
  const normalizedLine = normalizeText(line);
  if (!normalizedLine) return null;

  let best: { student: ImportStudent; confidence: number; matchedBy: string } | null = null;

  for (const student of students) {
    const code = normalizeText(student.studentCode);
    const name = normalizeText(student.fullName);
    const father = normalizeText(student.fatherName);
    const mobile = student.mobile.replace(/\D/g, "");

    let confidence = 0;
    let matchedBy = "";

    if (code && normalizedLine.includes(code)) {
      confidence = 1;
      matchedBy = "Student code";
    } else if (name && normalizedLine.includes(name) && father && normalizedLine.includes(father)) {
      confidence = 0.94;
      matchedBy = "Name + father name";
    } else if (name && normalizedLine.includes(name) && mobile && normalizedLine.includes(mobile)) {
      confidence = 0.92;
      matchedBy = "Name + mobile";
    } else if (name && normalizedLine.includes(name)) {
      confidence = 0.78;
      matchedBy = "Name only";
    }

    if (!best || confidence > best.confidence) {
      best = confidence ? { student, confidence, matchedBy } : best;
    }
  }

  return best;
}

async function extractPdfText(file: File) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "iti-erp-ocr-"));
  const tempFile = path.join(tempDir, file.name || "upload.pdf");
  try {
    await writeFile(tempFile, Buffer.from(await file.arrayBuffer()));
    const scriptPath = path.join(process.cwd(), "scripts", "extract-pdf-text.cjs");
    const { stdout } = await execFileAsync(process.execPath, [scriptPath, tempFile], {
      maxBuffer: 20 * 1024 * 1024
    });
    return stdout || "";
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function listImportStudents(filters: {
  session?: string;
  yearLabel?: string;
  instituteCode?: string;
  tradeName?: string;
}) {
  const rows = await prisma.student.findMany({
    where: {
      deletedAt: null,
      ...(filters.session ? { session: filters.session } : {}),
      ...(filters.yearLabel ? { yearLabel: filters.yearLabel } : {}),
      ...(filters.instituteCode
        ? {
            institute: {
              instituteCode: filters.instituteCode
            }
          }
        : {}),
      ...(filters.tradeName
        ? {
            trade: {
              name: {
                equals: filters.tradeName,
                mode: "insensitive"
              }
            }
          }
        : {})
    },
    include: {
      institute: true,
      trade: true,
      scholarshipRecord: true,
      prnScvtRecord: true
    }
  });

  return rows.map((item) => ({
    id: item.id,
    studentCode: item.studentCode,
    fullName: item.fullName,
    fatherName: item.fatherName,
    mobile: item.mobile,
    session: item.session,
    yearLabel: item.yearLabel,
    instituteCode: item.institute.instituteCode,
    instituteName: item.institute.name,
    instituteScvtCode: item.institute.scvtCode,
    tradeName: item.trade.name,
    scholarshipId: item.scholarshipRecord?.scholarshipId || null,
    scholarshipStatus: item.scholarshipRecord?.status || null,
    prnNumber: item.prnScvtRecord?.prnNumber || null,
    scvtRegistrationNumber: item.prnScvtRecord?.scvtRegistrationNumber || null
  }));
}

export async function previewOcrImport(input: {
  file: File;
  kind: OcrImportKind;
  session?: string;
  yearLabel?: string;
}) {
  const text = await extractPdfText(input.file);
  const detectedFilters = await resolveHeaderFilters(text);
  const candidates = buildCandidateTexts(input.kind, text);
  const students = await listImportStudents({
    session: input.session,
    yearLabel: input.yearLabel,
    instituteCode: detectedFilters.instituteCode || undefined,
    tradeName: detectedFilters.tradeName || undefined
  });
  const globalScholarshipStatus = input.kind === "SCHOLARSHIP" ? findStatusFromText(text, ScholarshipStatus.APPLIED) : null;

  const bestRows = new Map<string, OcrImportPreviewRow>();

  for (const line of candidates) {
    const match = findBestStudentForLine(line, students);
    if (!match) continue;

    const registrationToken = extractRegistrationToken(line, input.kind, match.student.studentCode, match.student.mobile);
    const entRollNumber = input.kind === "SCVT" ? extractEntRollNumber(line) : "";
    const admissionStatus = input.kind === "SCVT" ? extractScvtAdmissionStatus(line) : "";
    const extractedStatus =
      input.kind === "SCHOLARSHIP"
        ? findStatusFromText(line, globalScholarshipStatus || ScholarshipStatus.APPLIED)
        : VerificationStatus.VERIFIED;
    const creditedAmount = input.kind === "SCHOLARSHIP" ? extractCreditAmount(line) : "";
    const currentValue =
      input.kind === "SCHOLARSHIP"
        ? match.student.scholarshipId || ""
        : input.kind === "PRN"
          ? match.student.prnNumber || ""
          : match.student.scvtRegistrationNumber || "";
    const currentStatus =
      input.kind === "SCHOLARSHIP"
        ? match.student.scholarshipStatus || ScholarshipStatus.NOT_APPLIED
        : VerificationStatus.PENDING;

    if (!registrationToken && input.kind !== "SCHOLARSHIP") continue;
    if (!registrationToken && input.kind === "SCHOLARSHIP" && extractedStatus === ScholarshipStatus.NOT_APPLIED) continue;

    const row: OcrImportPreviewRow = {
      studentId: match.student.id,
      studentCode: match.student.studentCode,
      fullName: match.student.fullName,
      session: match.student.session,
      yearLabel: match.student.yearLabel,
      tradeName: match.student.tradeName,
      matchedBy: match.matchedBy,
      confidence: match.confidence,
      canApply: match.confidence >= 0.85 && (Boolean(registrationToken) || input.kind === "SCHOLARSHIP"),
      extractedValue: registrationToken,
      entRollNumber,
      admissionStatus,
      currentValue,
      extractedStatus,
      currentStatus,
      creditedAmount,
      lineText: line
    };

    const existing = bestRows.get(match.student.id);
    if (!existing || existing.confidence < row.confidence) {
      bestRows.set(match.student.id, row);
    }
  }

  const rows = Array.from(bestRows.values()).sort((left, right) => right.confidence - left.confidence || left.fullName.localeCompare(right.fullName));
  return {
    kind: input.kind,
    sourceName: input.file.name,
    detectedFilters,
    rows,
    summary: {
      parsedLines: candidates.length,
      matchedRows: rows.length,
      readyToApply: rows.filter((item) => item.canApply).length
    }
  } satisfies OcrImportPreview;
}

export async function applyOcrImport(input: {
  currentUserId?: string | null;
  preview: OcrImportPreview;
}) {
  const applicable = input.preview.rows.filter((item) => item.canApply);

  await prisma.$transaction(async (tx) => {
    for (const row of applicable) {
      if (input.preview.kind === "SCHOLARSHIP") {
        await tx.scholarshipRecord.update({
          where: { studentId: row.studentId },
          data: {
            scholarshipId: row.extractedValue || null,
            status: row.extractedStatus as ScholarshipStatus,
            approvedDate: row.extractedStatus === ScholarshipStatus.APPROVED ? new Date() : undefined,
            creditedAmount: row.creditedAmount ? Number(row.creditedAmount) : undefined,
            creditDate: row.creditedAmount ? new Date() : undefined
          }
        });
      } else {
        await tx.prnScvtRecord.update({
          where: { studentId: row.studentId },
          data: {
            entRollNumber: input.preview.kind === "SCVT" ? row.entRollNumber || null : undefined,
            admissionStatus: input.preview.kind === "SCVT" ? row.admissionStatus || null : undefined,
            ...(input.preview.kind === "PRN" ? { prnNumber: row.extractedValue || null } : {}),
            ...(input.preview.kind === "SCVT" ? { scvtRegistrationNumber: row.extractedValue || null } : {}),
            verificationStatus: VerificationStatus.VERIFIED,
            uploadDate: new Date(),
            remark: `${input.preview.kind} imported from ${input.preview.sourceName}`
          }
        });
      }
    }
  });

  await createAuditLog({
    userId: input.currentUserId,
    module: input.preview.kind === "SCHOLARSHIP" ? "SCHOLARSHIP" : "PRN_SCVT",
    action: `OCR_IMPORT_${input.preview.kind}`,
    metadata: {
      sourceName: input.preview.sourceName,
      matchedRows: input.preview.summary.matchedRows,
      appliedRows: applicable.length
    }
  });

  return {
    appliedRows: applicable.length
  };
}
