import { HrEmploymentStatus, HrQualificationLevel, HrSalaryType, HrStaffCategory } from "@prisma/client";
import { NextResponse } from "next/server";
import { assertUserActionAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
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
  isActive?: boolean;
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
    createdAt: item.createdAt.toISOString()
  };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ staffId: string }> }) {
  try {
    const user = await requireUser();
    assertUserActionAccess(user, "hr", "edit");
    const { staffId } = await params;

    const formData = await request.formData();
    const payloadText = formData.get("payload");
    if (typeof payloadText !== "string") {
      return NextResponse.json({ ok: false, message: "Payload is required" }, { status: 400 });
    }

    const payload = JSON.parse(payloadText) as StaffPayload;

    await prisma.hrStaff.update({
      where: { id: staffId },
      data: {
        ...(payload.employeeCode !== undefined ? { employeeCode: payload.employeeCode.trim().toUpperCase() } : {}),
        ...(payload.fullName !== undefined ? { fullName: payload.fullName.trim() } : {}),
        ...(payload.fatherName !== undefined ? { fatherName: toNullable(payload.fatherName) } : {}),
        ...(payload.motherName !== undefined ? { motherName: toNullable(payload.motherName) } : {}),
        ...(payload.spouseName !== undefined ? { spouseName: toNullable(payload.spouseName) } : {}),
        ...(payload.dateOfBirth !== undefined ? { dateOfBirth: toDate(payload.dateOfBirth) } : {}),
        ...(payload.joiningDate !== undefined ? { joiningDate: toDate(payload.joiningDate) } : {}),
        ...(payload.designation !== undefined ? { designation: toNullable(payload.designation) } : {}),
        ...(payload.department !== undefined ? { department: toNullable(payload.department) } : {}),
        ...(payload.staffCategory !== undefined && payload.staffCategory in HrStaffCategory
          ? { staffCategory: payload.staffCategory as HrStaffCategory }
          : {}),
        ...(payload.isCtiHolder !== undefined ? { isCtiHolder: Boolean(payload.isCtiHolder) } : {}),
        ...(payload.ctiPassingYear !== undefined ? { ctiPassingYear: toInt(payload.ctiPassingYear) } : {}),
        ...(payload.ctiTrade !== undefined ? { ctiTrade: toNullable(payload.ctiTrade) } : {}),
        ...(payload.ctiInstituteName !== undefined ? { ctiInstituteName: toNullable(payload.ctiInstituteName) } : {}),
        ...(payload.ctiPercentage !== undefined ? { ctiPercentage: toDecimal(payload.ctiPercentage) } : {}),
        ...(payload.salaryType !== undefined && payload.salaryType in HrSalaryType
          ? { salaryType: payload.salaryType as HrSalaryType }
          : {}),
        ...(payload.monthlySalary !== undefined ? { monthlySalary: toDecimal(payload.monthlySalary) } : {}),
        ...(payload.mobile !== undefined ? { mobile: toNullable(payload.mobile) } : {}),
        ...(payload.alternateMobile !== undefined ? { alternateMobile: toNullable(payload.alternateMobile) } : {}),
        ...(payload.email !== undefined ? { email: toNullable(payload.email) } : {}),
        ...(payload.aadhaarNo !== undefined ? { aadhaarNo: toNullable(payload.aadhaarNo) } : {}),
        ...(payload.panNo !== undefined ? { panNo: toNullable(payload.panNo) } : {}),
        ...(payload.bankName !== undefined ? { bankName: toNullable(payload.bankName) } : {}),
        ...(payload.accountNumber !== undefined ? { accountNumber: toNullable(payload.accountNumber) } : {}),
        ...(payload.ifscCode !== undefined ? { ifscCode: toNullable(payload.ifscCode) } : {}),
        ...(payload.addressLine !== undefined ? { addressLine: toNullable(payload.addressLine) } : {}),
        ...(payload.isGovtRecordOnly !== undefined ? { isGovtRecordOnly: Boolean(payload.isGovtRecordOnly) } : {}),
        ...(payload.isExperienceCase !== undefined ? { isExperienceCase: Boolean(payload.isExperienceCase) } : {}),
        ...(payload.experienceFromDate !== undefined ? { experienceFromDate: toDate(payload.experienceFromDate) } : {}),
        ...(payload.experienceToDate !== undefined ? { experienceToDate: toDate(payload.experienceToDate) } : {}),
        ...(payload.agreementEndDate !== undefined ? { agreementEndDate: toDate(payload.agreementEndDate) } : {}),
        ...(payload.agreedMonthlyAmount !== undefined ? { agreedMonthlyAmount: toDecimal(payload.agreedMonthlyAmount) } : {}),
        ...(payload.experienceNote !== undefined ? { experienceNote: toNullable(payload.experienceNote) } : {}),
        ...(payload.employmentStatus !== undefined && payload.employmentStatus in HrEmploymentStatus
          ? { employmentStatus: payload.employmentStatus as HrEmploymentStatus }
          : {}),
        ...(payload.isActive !== undefined ? { isActive: Boolean(payload.isActive) } : {})
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
    let photoUrl: string | null | undefined;

    const aadhaarFile = formData.get("aadhaarDocumentFile");
    if (aadhaarFile instanceof File && aadhaarFile.size > 0) {
      aadhaarDoc = await saveHrFile(staffId, aadhaarFile, "identity");
    }

    const panFile = formData.get("panDocumentFile");
    if (panFile instanceof File && panFile.size > 0) {
      panDoc = await saveHrFile(staffId, panFile, "identity");
    }

    const ctiFile = formData.get("ctiDocumentFile");
    if (ctiFile instanceof File && ctiFile.size > 0) {
      ctiDoc = await saveHrFile(staffId, ctiFile, "cti");
    }

    const photoFile = formData.get("photoFile");
    if (photoFile instanceof File && photoFile.size > 0) {
      const uploaded = await saveHrFile(staffId, photoFile, "photo");
      photoUrl = uploaded.fileUrl;
    }

    await prisma.hrQualification.deleteMany({
      where: { staffId }
    });

    const qualifications = mapQualifications(payload.qualifications);
    for (let index = 0; index < qualifications.length; index += 1) {
      const qualification = qualifications[index];
      let qualificationDoc =
        qualification.existingDocumentUrl && qualification.existingDocumentName
          ? { fileUrl: qualification.existingDocumentUrl, originalName: qualification.existingDocumentName }
          : null;
      const qualificationFile = formData.get(`qualificationDocumentFile-${index}`);
      if (qualificationFile instanceof File && qualificationFile.size > 0) {
        qualificationDoc = await saveHrFile(staffId, qualificationFile, "qualifications");
      }

      await prisma.hrQualification.create({
        data: {
          staffId,
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

    const updated = await prisma.hrStaff.update({
      where: { id: staffId },
      data: {
        aadhaarDocumentUrl: aadhaarDoc?.fileUrl || null,
        aadhaarDocumentName: aadhaarDoc?.originalName || null,
        panDocumentUrl: panDoc?.fileUrl || null,
        panDocumentName: panDoc?.originalName || null,
        ctiDocumentUrl: ctiDoc?.fileUrl || null,
        ctiDocumentName: ctiDoc?.originalName || null,
        ...(photoUrl ? { photoUrl } : {})
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
      { ok: false, message: error instanceof Error ? error.message : "Unable to update staff" },
      { status: 400 }
    );
  }
}
