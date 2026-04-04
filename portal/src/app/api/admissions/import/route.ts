import { AdmissionMode, StudentStatus, VerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { type CsvRow, parseCsv, pickCsvField } from "@/lib/csv-import-utils";
import { tradeUnitCatalog } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { reserveGeneratedCode } from "@/lib/numbering-config";
import { buildTradeCycleSessionVariants, countStudentsOnUnitForAdmission } from "@/lib/services/admission-service";
import { normalizeSessionLabel } from "@/lib/session-config";
type InstituteTrade = {
  id: string;
  tradeCode: string;
  name: string;
};
type InstituteWithTrades = {
  id: string;
  instituteCode: string;
  trades: InstituteTrade[];
};
type ParsedImportRow = {
  sourceRow: CsvRow;
  rowNumber: number;
  fullName: string;
  fatherName: string;
  mobile: string;
  dob: Date | null;
  session: string;
  yearLabel: string;
  unitNumber: number;
  instituteCode: string;
  tradeName: string;
  institute: InstituteWithTrades | undefined;
  trade: InstituteTrade | undefined;
  canImport: boolean;
  problems: string[];
};

function pickValue(row: CsvRow, keys: string[]) {
  return pickCsvField(row, keys);
}

function parseDate(value: string) {
  if (!value.trim()) return null;
  const trimmed = value.trim();
  const dmy = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) {
    const [, dd, mm, yyyy] = dmy;
    const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (ymd) {
    const [, yyyy, mm, dd] = ymd;
    const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeText(value: string) {
  return value.trim().toUpperCase();
}

async function parseImportRows(
  rows: CsvRow[],
  institutes: InstituteWithTrades[]
): Promise<ParsedImportRow[]> {
  return Promise.all(
    rows.map(async (row, index) => {
      const instituteCode = pickValue(row, ["instituteCode", "institute"]);
      const tradeCodeOrName = pickValue(row, ["tradeCode", "tradeName", "trade"]);
      const fullName = pickValue(row, ["fullName", "studentName", "name"]);
      const fatherName = pickValue(row, ["fatherName", "parentName", "guardianName"]);
      const mobile = pickValue(row, ["mobile"]);
      const dateOfBirthRaw = pickValue(row, ["dateOfBirth", "dob"]);
      const session = normalizeSessionLabel(pickValue(row, ["session"]) || "");
      const yearLabel = pickValue(row, ["yearLabel", "year"]) || "1st";
      const unitNumber = Number(pickValue(row, ["unitNumber", "unit"]) || 0);

      const institute = institutes.find((item) => item.instituteCode.toUpperCase() === instituteCode.toUpperCase());
      const trade = institute?.trades.find(
        (item) =>
          item.tradeCode.toUpperCase() === tradeCodeOrName.toUpperCase() ||
          item.name.toUpperCase() === tradeCodeOrName.toUpperCase()
      );
      const dob = parseDate(dateOfBirthRaw);

      const problems: string[] = [];
      if (!fullName) problems.push("Student name missing");
      if (!institute) problems.push("Institute not found");
      if (!trade) problems.push("Trade not found");
      if (!session) problems.push("Session missing");
      if (!dob) problems.push("DOB invalid");
      if (!unitNumber) problems.push("Unit missing");
      if (!mobile) problems.push("Mobile missing");

      const duplicate =
        dob && fullName
          ? await prisma.student.findFirst({
              where: {
                deletedAt: null,
                OR: [
                  mobile
                    ? {
                        mobile,
                        dateOfBirth: dob
                      }
                    : undefined,
                  {
                    fullName: normalizeText(fullName),
                    fatherName: fatherName ? normalizeText(fatherName) : undefined,
                    dateOfBirth: dob
                  }
                ].filter(Boolean) as any
              },
              select: {
                studentCode: true,
                fullName: true
              }
            })
          : null;

      if (duplicate) problems.push(`Duplicate: ${duplicate.fullName} (${duplicate.studentCode})`);

      return {
        sourceRow: row,
        rowNumber: index + 2,
        fullName,
        fatherName,
        mobile,
        dob,
        session,
        yearLabel,
        unitNumber,
        instituteCode,
        tradeName: trade?.name || tradeCodeOrName || "-",
        institute,
        trade,
        canImport: problems.length === 0,
        problems
      };
    })
  );
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "admissions", "add");

    const formData = await request.formData();
    const file = formData.get("file");
    const mode = String(formData.get("mode") || "preview").trim();

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ ok: false, message: "CSV file is required" }, { status: 400 });
    }

    const csvText = await file.text();
    const rows = parseCsv(csvText);
    if (!rows.length) {
      return NextResponse.json({ ok: false, message: "CSV has no usable rows" }, { status: 400 });
    }

    const institutes = await prisma.institute.findMany({
      include: {
        trades: true
      }
    });

    const parsedRows = await parseImportRows(rows, institutes);
    const previewRows = parsedRows.map((item) => ({
      rowNumber: item.rowNumber,
      fullName: item.fullName || "-",
      instituteCode: item.instituteCode,
      tradeName: item.tradeName,
      session: item.session || "-",
      yearLabel: item.yearLabel,
      unitNumber: item.unitNumber || 0,
      mobile: item.mobile || "-",
      canImport: item.canImport,
      problems: item.problems
    }));

    if (mode !== "import") {
      return NextResponse.json({
        ok: true,
        mode: "preview",
        totalRows: previewRows.length,
        importableCount: previewRows.filter((item) => item.canImport).length,
        blockedCount: previewRows.filter((item) => !item.canImport).length,
        rows: previewRows
      });
    }

    const importable = previewRows.filter((item) => item.canImport);
    const imported: string[] = [];
    const skipped: string[] = previewRows.filter((item) => !item.canImport).map((item) => `${item.fullName} (Row ${item.rowNumber})`);

    for (const item of parsedRows.filter((row) => row.canImport)) {
      if (!item.fullName || !item.mobile || !item.dob || !item.session || !item.unitNumber || !item.institute || !item.trade) {
        continue;
      }
      const guardianName = item.fatherName || "NOT PROVIDED";
      const tradeKey = `${item.institute.instituteCode}::${item.trade.tradeCode}`;
      const tradeConfig = tradeUnitCatalog[tradeKey];
      const yearLabel = item.yearLabel || "1st";
      const normalizedSession = tradeConfig
        ? buildTradeCycleSessionVariants(item.session, tradeConfig.durationYears)[0] || normalizeSessionLabel(item.session)
        : normalizeSessionLabel(item.session);

      if (tradeConfig) {
        if (item.unitNumber < 1 || item.unitNumber > tradeConfig.unitCount) {
          skipped.push(`${item.fullName} (Row ${item.rowNumber}): Unit ${item.unitNumber} invalid (trade has ${tradeConfig.unitCount} units)`);
          continue;
        }
        const existingOnUnit = await countStudentsOnUnitForAdmission({
          instituteId: item.institute.id,
          tradeId: item.trade.id,
          tradeKey,
          unitNumber: item.unitNumber,
          session: normalizedSession,
          yearLabel
        });
        if (existingOnUnit >= tradeConfig.seatsPerUnit) {
          skipped.push(`${item.fullName} (Row ${item.rowNumber}): Unit ${item.unitNumber} is full (${tradeConfig.seatsPerUnit} seats)`);
          continue;
        }
      }

      const studentCode = await reserveGeneratedCode("student", {
        institute: item.institute.instituteCode,
        trade: item.trade.tradeCode,
        session: normalizedSession
      });

      const created = await prisma.student.create({
        data: {
          studentCode,
          admissionNumber: studentCode,
          enrollmentNumber: pickValue(item.sourceRow, ["enrollmentNumber", "registrationNumber"]) || null,
          instituteId: item.institute.id,
          tradeId: item.trade.id,
          unitNumber: item.unitNumber,
          createdById: user.id,
          admissionMode: AdmissionMode.DIRECT,
          session: normalizedSession,
          yearLabel,
          admissionDate: parseDate(pickValue(item.sourceRow, ["admissionDate"])) || new Date(),
          admissionType: pickValue(item.sourceRow, ["admissionType"]) || "DIRECT",
          admissionStatusLabel: pickValue(item.sourceRow, ["admissionStatus", "admissionStatusLabel"]) || "REGISTERED",
          seatType: pickValue(item.sourceRow, ["seatType"]) || "REGULAR",
          rollNumber: pickValue(item.sourceRow, ["rollNumber"]) || null,
          batchLabel: pickValue(item.sourceRow, ["batch", "batchLabel"]) || null,
          shiftLabel: pickValue(item.sourceRow, ["shift", "shiftLabel"]) || null,
          status: StudentStatus.UNDER_REVIEW,
          fullName: normalizeText(item.fullName),
          fatherName: normalizeText(guardianName),
          motherName: pickValue(item.sourceRow, ["motherName"]) ? normalizeText(pickValue(item.sourceRow, ["motherName"])) : null,
          mobile: item.mobile,
          alternateMobile: pickValue(item.sourceRow, ["alternateMobile"]) || null,
          email: pickValue(item.sourceRow, ["email"]) || null,
          category: pickValue(item.sourceRow, ["category"]) || null,
          caste: pickValue(item.sourceRow, ["caste"]) || null,
          religion: pickValue(item.sourceRow, ["religion"]) || null,
          incomeDetails: pickValue(item.sourceRow, ["incomeDetails"]) || null,
          domicileDetails: pickValue(item.sourceRow, ["domicileDetails"]) || null,
          dateOfBirth: item.dob,
          address: pickValue(item.sourceRow, ["address"]) || null,
          documentsStatus: VerificationStatus.PENDING,
          admissionFormStatus: VerificationStatus.PENDING,
          eligibilityStatus: VerificationStatus.PENDING,
          undertakingStatus: VerificationStatus.PENDING,
          internalNotes: "Imported from admissions bulk upload"
        }
      });

      await prisma.parentIdentity.create({
        data: {
          studentId: created.id,
          relation: "FATHER",
          name: normalizeText(guardianName),
          mobile: pickValue(item.sourceRow, ["parentMobile"]) || null
        }
      });

      await prisma.educationQualification.create({
        data: {
          studentId: created.id,
          level: "TENTH",
          schoolName: pickValue(item.sourceRow, ["schoolName"]) || null,
          boardUniversity: pickValue(item.sourceRow, ["board", "boardUniversity"]) || null,
          certificateNumber: pickValue(item.sourceRow, ["certificateNumber", "tenthCertificateDetails"]) || null,
          rollNumber: pickValue(item.sourceRow, ["qualificationRollNumber", "rollNumber"]) || null,
          passingYear: Number(pickValue(item.sourceRow, ["passingYear"]) || 0) || null,
          percentage: Number(pickValue(item.sourceRow, ["percentage", "marks"]) || 0) || null,
          isPassed: true,
          minimumEligibility: true,
          verificationStatus: VerificationStatus.PENDING
        }
      });

      await prisma.feeProfile.create({
        data: {
          studentId: created.id,
          collectionMode: "DIRECT",
          finalFees: 0,
          paidAmount: 0,
          dueAmount: 0,
          paymentStatus: "UNPAID"
        }
      });

      await prisma.prnScvtRecord.create({ data: { studentId: created.id, verificationStatus: VerificationStatus.PENDING } });
      await prisma.examStatusRecord.create({ data: { studentId: created.id } });
      await prisma.scholarshipRecord.create({ data: { studentId: created.id, status: "NOT_APPLIED" } });
      await prisma.undertakingRecord.create({ data: { studentId: created.id, generationStatus: VerificationStatus.PENDING, signedStatus: VerificationStatus.PENDING } });

      imported.push(`${created.fullName} (${created.studentCode})`);
    }

    return NextResponse.json({
      ok: true,
      mode: "import",
      totalRows: rows.length,
      importableCount: importable.length,
      importedCount: imported.length,
      skippedCount: skipped.length,
      imported,
      skipped
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to import admission CSV"
      },
      { status: error instanceof Error && error.message.startsWith("Access denied") ? 403 : 500 }
    );
  }
}
