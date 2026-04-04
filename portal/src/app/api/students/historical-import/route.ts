import { ScholarshipStatus, VerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { type CsvRow, parseCsv, pickCsvField } from "@/lib/csv-import-utils";
import { prisma } from "@/lib/prisma";
import { normalizeSessionLabel } from "@/lib/session-config";

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
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDecimal(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeScholarshipStatus(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[\s/-]+/g, "_");
  if (normalized in ScholarshipStatus) return normalized as ScholarshipStatus;
  return ScholarshipStatus.NOT_APPLIED;
}

function normalizeVerificationStatus(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[\s/-]+/g, "_");
  if (normalized in VerificationStatus) return normalized as VerificationStatus;
  return VerificationStatus.PENDING;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "admissions", "add");

    const formData = await request.formData();
    const file = formData.get("file");
    const sessionRaw = String(formData.get("session") || "").trim();
    const session = normalizeSessionLabel(sessionRaw) || sessionRaw;
    const yearLabel = String(formData.get("yearLabel") || "").trim() || "1st";

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ ok: false, message: "CSV file is required" }, { status: 400 });
    }

    if (!session) {
      return NextResponse.json({ ok: false, message: "Session is required" }, { status: 400 });
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

    const instituteMap = new Map(institutes.map((item) => [item.instituteCode.toUpperCase(), item]));
    const existingCount = await prisma.student.count({
      where: {
        session,
        studentCode: {
          startsWith: `REC-${session}-`
        }
      }
    });

    const imported: string[] = [];
    const skipped: string[] = [];
    let generatedIndex = existingCount + 1;

    for (const row of rows) {
      const fullName = pickValue(row, ["fullName", "name", "studentName"]);
      const instituteCode = pickValue(row, ["instituteCode", "institute", "itiCode"]).toUpperCase();
      const tradeRaw = pickValue(row, ["tradeCode", "tradeName", "trade"]);

      if (!fullName || !instituteCode || !tradeRaw) {
        skipped.push(
          !fullName
            ? "Row: missing student name"
            : !instituteCode
              ? `${fullName}: missing institute code`
              : `${fullName}: missing trade (use trade name or tradeCode column)`
        );
        continue;
      }

      const institute = instituteMap.get(instituteCode);
      const trade = institute?.trades.find(
        (item) =>
          item.tradeCode.toUpperCase() === tradeRaw.toUpperCase() ||
          item.name.toUpperCase() === tradeRaw.toUpperCase()
      );

      if (!institute) {
        skipped.push(`${fullName}: institute not found (${instituteCode})`);
        continue;
      }
      if (!trade) {
        skipped.push(`${fullName}: trade not found (${tradeRaw}) for ${instituteCode}`);
        continue;
      }

      const studentCode =
        pickValue(row, ["studentCode", "admissionNo", "admissionNumber"]) ||
        `REC-${session}-${String(generatedIndex++).padStart(4, "0")}`;

      const duplicate = await prisma.student.findUnique({
        where: { studentCode }
      });

      if (duplicate) {
        skipped.push(`${fullName} (${studentCode})`);
        continue;
      }

      const mobile = pickValue(row, ["mobile", "studentMobile"]) || `HIST-${Date.now()}-${generatedIndex}`;
      const fatherName = pickValue(row, ["fatherName", "guardianName"]);
      const motherName = pickValue(row, ["motherName"]);
      const email = pickValue(row, ["email"]);
      const category = pickValue(row, ["category"]);
      const address = pickValue(row, ["address"]);
      const unitNumber = Number(pickValue(row, ["unitNumber", "unit"])) || null;
      const scholarshipId = pickValue(row, ["scholarshipId", "scholarshipNumber"]);
      const scholarshipStatus = normalizeScholarshipStatus(pickValue(row, ["scholarshipStatus", "scholarshipStage"]));
      const prnNumber = pickValue(row, ["prnNumber", "prn"]);
      const scvtRegistrationNumber = pickValue(row, ["scvtRegistrationNumber", "scvtNumber", "scvt"]);
      const creditedAmount = parseDecimal(pickValue(row, ["creditedAmount", "scholarshipAmount"]));
      const approvedDate = parseDate(pickValue(row, ["approvedDate"]));
      const creditDate = parseDate(pickValue(row, ["creditDate"]));
      const uploadDate = parseDate(pickValue(row, ["registrationDate", "uploadDate"]));
      const registrationStatus = normalizeVerificationStatus(pickValue(row, ["registrationStatus", "verificationStatus"]));

      await prisma.$transaction(async (tx) => {
        const student = await tx.student.create({
          data: {
            studentCode,
            instituteId: institute.id,
            tradeId: trade.id,
            unitNumber,
            createdById: user.id,
            session,
            yearLabel: pickValue(row, ["yearLabel", "year"]) || yearLabel,
            fullName,
            mobile,
            email: email || null,
            category: category || null,
            address: address || null,
            fatherName: fatherName || null,
            motherName: motherName || null,
            status: "COMPLETED",
            admissionFormStatus: "VERIFIED",
            documentsStatus: "VERIFIED",
            undertakingStatus: "VERIFIED",
            eligibilityStatus: "VERIFIED",
            completionDate: new Date(),
            internalNotes: `Historical session upload (${session})`
          }
        });

        if (fatherName) {
          await tx.parentIdentity.create({
            data: {
              studentId: student.id,
              relation: "FATHER",
              name: fatherName
            }
          });
        }

        await tx.feeProfile.create({
          data: {
            studentId: student.id,
            collectionMode: "DIRECT",
            scholarshipApplied: scholarshipStatus !== ScholarshipStatus.NOT_APPLIED,
            finalFees: 0,
            paidAmount: 0,
            dueAmount: 0,
            paymentStatus: "PAID",
            practicalExamEligible: true,
            adminOverride: false
          }
        });

        await tx.scholarshipRecord.create({
          data: {
            studentId: student.id,
            scholarshipId: scholarshipId || null,
            status: scholarshipStatus,
            approvedDate,
            creditedAmount,
            creditDate
          }
        });

        await tx.prnScvtRecord.create({
          data: {
            studentId: student.id,
            prnNumber: prnNumber || null,
            scvtRegistrationNumber: scvtRegistrationNumber || null,
            uploadDate,
            verificationStatus:
              prnNumber || scvtRegistrationNumber ? VerificationStatus.VERIFIED : registrationStatus,
            remark: "Imported from historical session CSV"
          }
        });

        await tx.examStatusRecord.create({
          data: {
            studentId: student.id,
            practicalExamAppearance: "APPEARED",
            practicalEligibleReappear: true,
            theoryEligibleReappear: true
          }
        });

        await tx.undertakingRecord.create({
          data: {
            studentId: student.id,
            generationStatus: VerificationStatus.VERIFIED,
            signedStatus: VerificationStatus.VERIFIED
          }
        });
      });

      imported.push(`${fullName} (${studentCode})`);
    }

    return NextResponse.json({
      ok: true,
      importedCount: imported.length,
      skippedCount: skipped.length,
      imported,
      skipped
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to import historical session students" },
      { status: 400 }
    );
  }
}
