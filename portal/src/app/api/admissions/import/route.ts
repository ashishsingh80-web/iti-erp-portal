import { AdmissionMode, StudentStatus, VerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reserveGeneratedCode } from "@/lib/numbering-config";
import { normalizeSessionLabel } from "@/lib/session-config";

type CsvRow = Record<string, string>;

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current.trim());
      if (row.some((item) => item.length)) rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some((item) => item.length)) rows.push(row);
  if (!rows.length) return [];

  const headers = rows[0].map((item) => item.trim());
  return rows.slice(1).map((items) => {
    const output: CsvRow = {};
    headers.forEach((header, headerIndex) => {
      output[header] = items[headerIndex]?.trim() || "";
    });
    return output;
  });
}

function pickValue(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const found = row[key];
    if (typeof found === "string" && found.trim()) return found.trim();
  }
  return "";
}

function parseDate(value: string) {
  if (!value.trim()) return null;
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeText(value: string) {
  return value.trim().toUpperCase();
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

    const previewRows = await Promise.all(
      rows.map(async (row, index) => {
        const instituteCode = pickValue(row, ["instituteCode", "institute"]);
        const tradeCodeOrName = pickValue(row, ["tradeCode", "tradeName", "trade"]);
        const fullName = pickValue(row, ["fullName", "studentName", "name"]);
        const fatherName = pickValue(row, ["fatherName"]);
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
          rowNumber: index + 2,
          fullName: fullName || "-",
          instituteCode,
          tradeName: trade?.name || tradeCodeOrName || "-",
          session: session || "-",
          yearLabel,
          unitNumber: unitNumber || 0,
          mobile: mobile || "-",
          canImport: problems.length === 0,
          problems
        };
      })
    );

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

    for (const row of rows) {
      const fullName = pickValue(row, ["fullName", "studentName", "name"]);
      const fatherName = pickValue(row, ["fatherName"]);
      const mobile = pickValue(row, ["mobile"]);
      const dob = parseDate(pickValue(row, ["dateOfBirth", "dob"]));
      const session = pickValue(row, ["session"]);
      const unitNumber = Number(pickValue(row, ["unitNumber", "unit"]) || 0);
      const instituteCode = pickValue(row, ["instituteCode", "institute"]);
      const tradeCodeOrName = pickValue(row, ["tradeCode", "tradeName", "trade"]);
      const institute = institutes.find((item) => item.instituteCode.toUpperCase() === instituteCode.toUpperCase());
      const trade = institute?.trades.find(
        (item) =>
          item.tradeCode.toUpperCase() === tradeCodeOrName.toUpperCase() ||
          item.name.toUpperCase() === tradeCodeOrName.toUpperCase()
      );

      if (!fullName || !fatherName || !mobile || !dob || !session || !unitNumber || !institute || !trade) {
        continue;
      }

      const exists = await prisma.student.findFirst({
        where: {
          deletedAt: null,
          OR: [
            {
              mobile,
              dateOfBirth: dob
            },
            {
              fullName: normalizeText(fullName),
              fatherName: normalizeText(fatherName),
              dateOfBirth: dob
            }
          ]
        }
      });

      if (exists) continue;

      const studentCode = await reserveGeneratedCode("student", {
        institute: institute.instituteCode,
        trade: trade.tradeCode,
        session
      });

      const created = await prisma.student.create({
        data: {
          studentCode,
          admissionNumber: studentCode,
          enrollmentNumber: pickValue(row, ["enrollmentNumber", "registrationNumber"]) || null,
          instituteId: institute.id,
          tradeId: trade.id,
          unitNumber,
          createdById: user.id,
          admissionMode: AdmissionMode.DIRECT,
          session,
          yearLabel: pickValue(row, ["yearLabel", "year"]) || "1st",
          admissionDate: parseDate(pickValue(row, ["admissionDate"])) || new Date(),
          admissionType: pickValue(row, ["admissionType"]) || "DIRECT",
          admissionStatusLabel: pickValue(row, ["admissionStatus", "admissionStatusLabel"]) || "REGISTERED",
          seatType: pickValue(row, ["seatType"]) || "REGULAR",
          rollNumber: pickValue(row, ["rollNumber"]) || null,
          batchLabel: pickValue(row, ["batch", "batchLabel"]) || null,
          shiftLabel: pickValue(row, ["shift", "shiftLabel"]) || null,
          status: StudentStatus.UNDER_REVIEW,
          fullName: normalizeText(fullName),
          fatherName: normalizeText(fatherName),
          motherName: pickValue(row, ["motherName"]) ? normalizeText(pickValue(row, ["motherName"])) : null,
          mobile,
          alternateMobile: pickValue(row, ["alternateMobile"]) || null,
          email: pickValue(row, ["email"]) || null,
          category: pickValue(row, ["category"]) || null,
          caste: pickValue(row, ["caste"]) || null,
          religion: pickValue(row, ["religion"]) || null,
          incomeDetails: pickValue(row, ["incomeDetails"]) || null,
          domicileDetails: pickValue(row, ["domicileDetails"]) || null,
          dateOfBirth: dob,
          address: pickValue(row, ["address"]) || null,
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
          name: normalizeText(fatherName),
          mobile: pickValue(row, ["parentMobile"]) || null
        }
      });

      await prisma.educationQualification.create({
        data: {
          studentId: created.id,
          level: "TENTH",
          schoolName: pickValue(row, ["schoolName"]) || null,
          boardUniversity: pickValue(row, ["board", "boardUniversity"]) || null,
          certificateNumber: pickValue(row, ["certificateNumber", "tenthCertificateDetails"]) || null,
          rollNumber: pickValue(row, ["qualificationRollNumber", "rollNumber"]) || null,
          passingYear: Number(pickValue(row, ["passingYear"]) || 0) || null,
          percentage: Number(pickValue(row, ["percentage", "marks"]) || 0) || null,
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
