import { HrEmploymentStatus, HrQualificationLevel, HrSalaryType, HrStaffCategory } from "@prisma/client";
import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { previewGeneratedCode, reserveGeneratedCode } from "@/lib/numbering-config";
import { prisma } from "@/lib/prisma";
import { saveHrFile } from "@/lib/services/hr-upload-service";

type QualificationPayload = {
  level: string;
  specialization?: string;
  boardUniversity?: string;
  passingYear?: string | number | null;
  percentage?: string | number | null;
  existingDocumentUrl?: string | null;
  existingDocumentName?: string | null;
};

type StaffPayload = {
  employeeCode?: string;
  fullName?: string;
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  dateOfBirth?: string;
  joiningDate?: string;
  designation?: string;
  department?: string;
  staffCategory?: string;
  qualifications?: QualificationPayload[];
  isCtiHolder?: boolean;
  ctiPassingYear?: string | number | null;
  ctiTrade?: string;
  ctiInstituteName?: string;
  ctiPercentage?: string | number | null;
  salaryType?: string;
  monthlySalary?: string | number | null;
  mobile?: string;
  alternateMobile?: string;
  email?: string;
  aadhaarNo?: string;
  panNo?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  addressLine?: string;
  isGovtRecordOnly?: boolean;
  isExperienceCase?: boolean;
  experienceFromDate?: string;
  experienceToDate?: string;
  agreementEndDate?: string;
  agreedMonthlyAmount?: string | number | null;
  experienceNote?: string;
  employmentStatus?: string;
  aadhaarDocumentUrl?: string | null;
  aadhaarDocumentName?: string | null;
  panDocumentUrl?: string | null;
  panDocumentName?: string | null;
  ctiDocumentUrl?: string | null;
  ctiDocumentName?: string | null;
};

function toNullable(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toDate(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDecimal(value?: string | number | null) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInt(value?: string | number | null) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function parsePayload(requestPayload: StaffPayload) {
  return {
    employeeCode: requestPayload.employeeCode?.trim().toUpperCase() || "",
    fullName: requestPayload.fullName?.trim() || "",
    fatherName: toNullable(requestPayload.fatherName),
    motherName: toNullable(requestPayload.motherName),
    spouseName: toNullable(requestPayload.spouseName),
    dateOfBirth: toDate(requestPayload.dateOfBirth),
    joiningDate: toDate(requestPayload.joiningDate),
    designation: toNullable(requestPayload.designation),
    department: toNullable(requestPayload.department),
    staffCategory:
      requestPayload.staffCategory && requestPayload.staffCategory in HrStaffCategory
        ? (requestPayload.staffCategory as HrStaffCategory)
        : HrStaffCategory.NON_TEACHING,
    isCtiHolder: Boolean(requestPayload.isCtiHolder),
    ctiPassingYear: toInt(requestPayload.ctiPassingYear),
    ctiTrade: toNullable(requestPayload.ctiTrade),
    ctiInstituteName: toNullable(requestPayload.ctiInstituteName),
    ctiPercentage: toDecimal(requestPayload.ctiPercentage),
    salaryType:
      requestPayload.salaryType && requestPayload.salaryType in HrSalaryType
        ? (requestPayload.salaryType as HrSalaryType)
        : HrSalaryType.MONTHLY,
    monthlySalary: toDecimal(requestPayload.monthlySalary),
    mobile: toNullable(requestPayload.mobile),
    alternateMobile: toNullable(requestPayload.alternateMobile),
    email: toNullable(requestPayload.email),
    aadhaarNo: toNullable(requestPayload.aadhaarNo),
    panNo: toNullable(requestPayload.panNo),
    bankName: toNullable(requestPayload.bankName),
    accountNumber: toNullable(requestPayload.accountNumber),
    ifscCode: toNullable(requestPayload.ifscCode),
    addressLine: toNullable(requestPayload.addressLine),
    isGovtRecordOnly: Boolean(requestPayload.isGovtRecordOnly),
    isExperienceCase: Boolean(requestPayload.isExperienceCase),
    experienceFromDate: toDate(requestPayload.experienceFromDate),
    experienceToDate: toDate(requestPayload.experienceToDate),
    agreementEndDate: toDate(requestPayload.agreementEndDate),
    agreedMonthlyAmount: toDecimal(requestPayload.agreedMonthlyAmount),
    experienceNote: toNullable(requestPayload.experienceNote),
    employmentStatus:
      requestPayload.employmentStatus && requestPayload.employmentStatus in HrEmploymentStatus
        ? (requestPayload.employmentStatus as HrEmploymentStatus)
        : HrEmploymentStatus.ACTIVE
  };
}

function mapQualifications(qualifications: QualificationPayload[] | undefined) {
  return (qualifications || [])
    .filter((item) => item.level && item.level in HrQualificationLevel)
    .map((item) => ({
      level: item.level as HrQualificationLevel,
      specialization: toNullable(item.specialization),
      boardUniversity: toNullable(item.boardUniversity),
      passingYear: toInt(item.passingYear),
      percentage: toDecimal(item.percentage),
      existingDocumentUrl: item.existingDocumentUrl || null,
      existingDocumentName: item.existingDocumentName || null
    }));
}

function serializeStaff(item: any) {
  return {
    id: item.id,
    employeeCode: item.employeeCode,
    fullName: item.fullName,
    fatherName: item.fatherName,
    motherName: item.motherName,
    spouseName: item.spouseName,
    dateOfBirth: item.dateOfBirth ? item.dateOfBirth.toISOString().slice(0, 10) : "",
    joiningDate: item.joiningDate ? item.joiningDate.toISOString().slice(0, 10) : "",
    designation: item.designation,
    department: item.department,
    staffCategory: item.staffCategory,
    qualifications: item.qualifications.map((qualification: any) => ({
      id: qualification.id,
      level: qualification.level,
      specialization: qualification.specialization,
      boardUniversity: qualification.boardUniversity,
      passingYear: qualification.passingYear || null,
      percentage: qualification.percentage?.toString() || "",
      documentUrl: qualification.documentUrl,
      documentName: qualification.documentName
    })),
    isCtiHolder: item.isCtiHolder,
    ctiPassingYear: item.ctiPassingYear || null,
    ctiTrade: item.ctiTrade,
    ctiInstituteName: item.ctiInstituteName,
    ctiPercentage: item.ctiPercentage?.toString() || "",
    ctiDocumentUrl: item.ctiDocumentUrl,
    ctiDocumentName: item.ctiDocumentName,
    salaryType: item.salaryType,
    monthlySalary: item.monthlySalary?.toString() || "",
    mobile: item.mobile,
    alternateMobile: item.alternateMobile,
    email: item.email,
    aadhaarNo: item.aadhaarNo,
    panNo: item.panNo,
    aadhaarDocumentUrl: item.aadhaarDocumentUrl,
    aadhaarDocumentName: item.aadhaarDocumentName,
    panDocumentUrl: item.panDocumentUrl,
    panDocumentName: item.panDocumentName,
    bankName: item.bankName,
    accountNumber: item.accountNumber,
    ifscCode: item.ifscCode,
    addressLine: item.addressLine,
    photoUrl: item.photoUrl,
    isGovtRecordOnly: item.isGovtRecordOnly,
    isExperienceCase: item.isExperienceCase,
    experienceFromDate: item.experienceFromDate ? item.experienceFromDate.toISOString().slice(0, 10) : "",
    experienceToDate: item.experienceToDate ? item.experienceToDate.toISOString().slice(0, 10) : "",
    agreementEndDate: item.agreementEndDate ? item.agreementEndDate.toISOString().slice(0, 10) : "",
    agreedMonthlyAmount: item.agreedMonthlyAmount?.toString() || "",
    experienceNote: item.experienceNote,
    employmentStatus: item.employmentStatus,
    isActive: item.isActive,
    lastPaymentAmount: item.payments[0]?.netAmount?.toString() || "",
    lastPaymentDate: item.payments[0]?.paymentDate?.toISOString() || "",
    createdAt: item.createdAt.toISOString()
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "hr", "view");
    const url = new URL(request.url);
    if (url.searchParams.get("preview") === "code") {
      const code = await previewGeneratedCode("employee");
      return NextResponse.json({ ok: true, code });
    }

    const staff = await prisma.hrStaff.findMany({
      where:
        url.searchParams.get("scope") === "actual"
          ? {
              isGovtRecordOnly: false,
              isActive: true
            }
          : undefined,
      include: {
        qualifications: {
          orderBy: [{ passingYear: "asc" }, { createdAt: "asc" }]
        },
        payments: {
          orderBy: { paymentDate: "desc" },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const rows = staff.map((item) => serializeStaff(item));

    if (url.searchParams.get("format") === "csv") {
      const header = [
        "Employee Code",
        "Full Name",
        "Designation",
        "Department",
        "Category",
        "Employment Status",
        "Active",
        "Govt Record Only",
        "Experience Case",
        "Experience From",
        "Experience To",
        "Agreement End",
        "Agreed Monthly Amount",
        "Mobile"
      ];
      const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
      const body = rows.map((item) =>
        [
          item.employeeCode,
          item.fullName,
          item.designation || "",
          item.department || "",
          item.staffCategory,
          item.employmentStatus,
          item.isActive ? "Yes" : "No",
          item.isGovtRecordOnly ? "Yes" : "No",
          item.isExperienceCase ? "Yes" : "No",
          item.experienceFromDate || "",
          item.experienceToDate || "",
          item.agreementEndDate || "",
          item.agreedMonthlyAmount || "",
          item.mobile || ""
        ].map(escape).join(",")
      );

      return new NextResponse([header.map(escape).join(","), ...body].join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="hr-${url.searchParams.get("scope") === "actual" ? "actual" : "whole"}-staff.csv"`
        }
      });
    }

    return NextResponse.json({
      ok: true,
      staff: rows
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load HR staff" },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "hr", "add");

    const formData = await request.formData();
    const payloadText = formData.get("payload");
    if (typeof payloadText !== "string") {
      return NextResponse.json({ ok: false, message: "Payload is required" }, { status: 400 });
    }

    const payload = JSON.parse(payloadText) as StaffPayload;
    const parsed = parsePayload(payload);
    if (!parsed.fullName) {
      return NextResponse.json({ ok: false, message: "Employee full name is required" }, { status: 400 });
    }
    parsed.employeeCode = parsed.employeeCode || (await reserveGeneratedCode("employee"));

    const created = await prisma.hrStaff.create({
      data: {
        ...parsed,
        isActive: true
      }
    });

    let aadhaarDoc = payload.aadhaarDocumentUrl && payload.aadhaarDocumentName
      ? { fileUrl: payload.aadhaarDocumentUrl, originalName: payload.aadhaarDocumentName }
      : null;
    let panDoc = payload.panDocumentUrl && payload.panDocumentName
      ? { fileUrl: payload.panDocumentUrl, originalName: payload.panDocumentName }
      : null;
    let ctiDoc = payload.ctiDocumentUrl && payload.ctiDocumentName
      ? { fileUrl: payload.ctiDocumentUrl, originalName: payload.ctiDocumentName }
      : null;
    let photoUrl: string | null = null;

    const aadhaarFile = formData.get("aadhaarDocumentFile");
    if (aadhaarFile instanceof File && aadhaarFile.size > 0) {
      aadhaarDoc = await saveHrFile(created.id, aadhaarFile, "identity");
    }

    const panFile = formData.get("panDocumentFile");
    if (panFile instanceof File && panFile.size > 0) {
      panDoc = await saveHrFile(created.id, panFile, "identity");
    }

    const ctiFile = formData.get("ctiDocumentFile");
    if (ctiFile instanceof File && ctiFile.size > 0) {
      ctiDoc = await saveHrFile(created.id, ctiFile, "cti");
    }

    const photoFile = formData.get("photoFile");
    if (photoFile instanceof File && photoFile.size > 0) {
      const uploaded = await saveHrFile(created.id, photoFile, "photo");
      photoUrl = uploaded.fileUrl;
    }

    const qualifications = mapQualifications(payload.qualifications);
    if (qualifications.length) {
      for (let index = 0; index < qualifications.length; index += 1) {
        const qualification = qualifications[index];
        let qualificationDoc =
          qualification.existingDocumentUrl && qualification.existingDocumentName
            ? { fileUrl: qualification.existingDocumentUrl, originalName: qualification.existingDocumentName }
            : null;
        const qualificationFile = formData.get(`qualificationDocumentFile-${index}`);
        if (qualificationFile instanceof File && qualificationFile.size > 0) {
          qualificationDoc = await saveHrFile(created.id, qualificationFile, "qualifications");
        }

        await prisma.hrQualification.create({
          data: {
            staffId: created.id,
            level: qualification.level,
            specialization: qualification.specialization,
            boardUniversity: qualification.boardUniversity,
            passingYear: qualification.passingYear,
            percentage: qualification.percentage,
            documentUrl: qualificationDoc?.fileUrl || null,
            documentName: qualificationDoc?.originalName || null
          }
        });
      }
    }

    const updated = await prisma.hrStaff.update({
      where: { id: created.id },
      data: {
        aadhaarDocumentUrl: aadhaarDoc?.fileUrl || null,
        aadhaarDocumentName: aadhaarDoc?.originalName || null,
        panDocumentUrl: panDoc?.fileUrl || null,
        panDocumentName: panDoc?.originalName || null,
        ctiDocumentUrl: ctiDoc?.fileUrl || null,
        ctiDocumentName: ctiDoc?.originalName || null,
        photoUrl
      },
      include: {
        qualifications: {
          orderBy: [{ passingYear: "asc" }, { createdAt: "asc" }]
        },
        payments: {
          orderBy: { paymentDate: "desc" },
          take: 1
        }
      }
    });

    return NextResponse.json({ ok: true, staff: serializeStaff(updated) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to save staff" },
      { status: 400 }
    );
  }
}
