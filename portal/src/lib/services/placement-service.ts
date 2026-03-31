import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/audit-service";

type PlacementStatusValue =
  | "INTERESTED"
  | "APPLIED"
  | "SELECTED"
  | "OFFERED"
  | "JOINED"
  | "REJECTED"
  | "NOT_JOINED";

type ApprenticeshipStatusValue =
  | "NOT_STARTED"
  | "APPLIED"
  | "UNDER_PROCESS"
  | "ACTIVE"
  | "COMPLETED";

const prismaAny = prisma as any;

export const placementStatusOptions = [
  { label: "Interested", value: "INTERESTED" },
  { label: "Applied", value: "APPLIED" },
  { label: "Selected", value: "SELECTED" },
  { label: "Offered", value: "OFFERED" },
  { label: "Joined", value: "JOINED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Not Joined", value: "NOT_JOINED" }
] as const;

export const apprenticeshipStatusOptions = [
  { label: "Not Started", value: "NOT_STARTED" },
  { label: "Applied", value: "APPLIED" },
  { label: "Under Process", value: "UNDER_PROCESS" },
  { label: "Active", value: "ACTIVE" },
  { label: "Completed", value: "COMPLETED" }
] as const;

function buildCompanyCode() {
  return `CMP-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function listPlacementDeskData(search = "", status = "") {
  const [companies, students, placements] = await Promise.all([
    prismaAny.placementCompany.findMany({
      where: {
        ...(search.trim()
          ? {
              OR: [
                { companyName: { contains: search.trim(), mode: "insensitive" } },
                { companyCode: { contains: search.trim(), mode: "insensitive" } },
                { contactPerson: { contains: search.trim(), mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: [{ isActive: "desc" }, { companyName: "asc" }],
      take: 80
    }),
    prisma.student.findMany({
      where: {
        deletedAt: null,
        lifecycleStage: { in: ["ALUMNI", "ACTIVE", "PROMOTED"] },
        ...(search.trim()
          ? {
              OR: [
                { fullName: { contains: search.trim(), mode: "insensitive" } },
                { studentCode: { contains: search.trim(), mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: {
        institute: true,
        trade: true
      },
      orderBy: { createdAt: "desc" },
      take: 60
    }),
    prismaAny.placementRecord.findMany({
      where: {
        ...(status ? { placementStatus: status as PlacementStatusValue } : {}),
        ...(search.trim()
          ? {
              OR: [
                { employerName: { contains: search.trim(), mode: "insensitive" } },
                { designation: { contains: search.trim(), mode: "insensitive" } },
                { student: { fullName: { contains: search.trim(), mode: "insensitive" } } },
                { student: { studentCode: { contains: search.trim(), mode: "insensitive" } } }
              ]
            }
          : {})
      },
      include: {
        student: {
          include: {
            institute: true,
            trade: true
          }
        },
        company: true,
        createdBy: true
      },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  ]);

  return {
    companies: companies.map((row: any) => ({
      id: row.id,
      companyCode: row.companyCode,
      companyName: row.companyName,
      contactPerson: row.contactPerson || "",
      mobile: row.mobile || "",
      email: row.email || "",
      addressLine: row.addressLine || "",
      industryType: row.industryType || "",
      note: row.note || "",
      isActive: row.isActive
    })),
    students: students.map((row: any) => ({
      id: row.id,
      label: `${row.studentCode} - ${row.fullName} (${row.trade.name})`
    })),
    placements: placements.map((row: any) => ({
      id: row.id,
      studentId: row.studentId,
      studentName: row.student.fullName,
      studentCode: row.student.studentCode,
      tradeName: row.student.trade.name,
      session: row.student.session,
      employerName: row.employerName,
      companyId: row.companyId || "",
      companyName: row.company?.companyName || "",
      designation: row.designation || "",
      locationName: row.locationName || "",
      salaryOffered: row.salaryOffered?.toString() || "",
      placementStatus: row.placementStatus,
      apprenticeshipStatus: row.apprenticeshipStatus,
      offerDate: row.offerDate ? row.offerDate.toISOString().slice(0, 10) : "",
      joiningDate: row.joiningDate ? row.joiningDate.toISOString().slice(0, 10) : "",
      completionDate: row.completionDate ? row.completionDate.toISOString().slice(0, 10) : "",
      note: row.note || "",
      createdByName: row.createdBy?.name || "System"
    }))
  };
}

export async function createPlacementCompany(
  payload: {
    companyName: string;
    contactPerson?: string;
    mobile?: string;
    email?: string;
    addressLine?: string;
    industryType?: string;
    note?: string;
  },
  userId?: string | null
) {
  if (!payload.companyName.trim()) throw new Error("Company name is required");

  const company = await prismaAny.placementCompany.create({
    data: {
      companyCode: buildCompanyCode(),
      companyName: payload.companyName.trim(),
      contactPerson: payload.contactPerson?.trim() || null,
      mobile: payload.mobile?.trim() || null,
      email: payload.email?.trim() || null,
      addressLine: payload.addressLine?.trim() || null,
      industryType: payload.industryType?.trim() || null,
      note: payload.note?.trim() || null,
      createdById: userId || null
    }
  });

  await createAuditLog({
    userId,
    module: "placement",
    action: "CREATE_COMPANY",
    metadata: {
      companyCode: company.companyCode,
      companyName: company.companyName
    }
  });

  return company;
}

export async function createPlacementRecord(
  payload: {
    studentId: string;
    companyId?: string;
    employerName: string;
    designation?: string;
    locationName?: string;
    salaryOffered?: string;
    placementStatus?: string;
    apprenticeshipStatus?: string;
    offerDate?: string;
    joiningDate?: string;
    completionDate?: string;
    note?: string;
  },
  userId?: string | null
) {
  if (!payload.studentId || !payload.employerName.trim()) {
    throw new Error("Student and employer name are required");
  }

  const record = await prismaAny.placementRecord.create({
    data: {
      studentId: payload.studentId,
      companyId: payload.companyId || null,
      employerName: payload.employerName.trim(),
      designation: payload.designation?.trim() || null,
      locationName: payload.locationName?.trim() || null,
      salaryOffered: payload.salaryOffered ? new Prisma.Decimal(payload.salaryOffered) : null,
      placementStatus: (payload.placementStatus || "INTERESTED") as PlacementStatusValue,
      apprenticeshipStatus: (payload.apprenticeshipStatus || "NOT_STARTED") as ApprenticeshipStatusValue,
      offerDate: payload.offerDate ? new Date(`${payload.offerDate}T00:00:00.000Z`) : null,
      joiningDate: payload.joiningDate ? new Date(`${payload.joiningDate}T00:00:00.000Z`) : null,
      completionDate: payload.completionDate ? new Date(`${payload.completionDate}T00:00:00.000Z`) : null,
      note: payload.note?.trim() || null,
      createdById: userId || null
    }
  });

  await createAuditLog({
    userId,
    studentId: payload.studentId,
    module: "placement",
    action: "CREATE_PLACEMENT",
    metadata: {
      placementId: record.id,
      placementStatus: record.placementStatus,
      apprenticeshipStatus: record.apprenticeshipStatus
    }
  });

  return record;
}

export async function updatePlacementRecord(
  placementId: string,
  payload: {
    companyId?: string;
    employerName?: string;
    designation?: string;
    locationName?: string;
    salaryOffered?: string;
    placementStatus?: string;
    apprenticeshipStatus?: string;
    offerDate?: string;
    joiningDate?: string;
    completionDate?: string;
    note?: string;
  },
  userId?: string | null
) {
  const existing = await prismaAny.placementRecord.findUnique({ where: { id: placementId } });
  if (!existing) throw new Error("Placement record not found");

  const updated = await prismaAny.placementRecord.update({
    where: { id: placementId },
    data: {
      companyId: payload.companyId !== undefined ? payload.companyId || null : existing.companyId,
      employerName: payload.employerName?.trim() || existing.employerName,
      designation: payload.designation !== undefined ? payload.designation?.trim() || null : existing.designation,
      locationName: payload.locationName !== undefined ? payload.locationName?.trim() || null : existing.locationName,
      salaryOffered:
        payload.salaryOffered !== undefined
          ? payload.salaryOffered
            ? new Prisma.Decimal(payload.salaryOffered)
            : null
          : existing.salaryOffered,
      placementStatus: (payload.placementStatus || existing.placementStatus) as PlacementStatusValue,
      apprenticeshipStatus: (payload.apprenticeshipStatus || existing.apprenticeshipStatus) as ApprenticeshipStatusValue,
      offerDate: payload.offerDate !== undefined ? (payload.offerDate ? new Date(`${payload.offerDate}T00:00:00.000Z`) : null) : existing.offerDate,
      joiningDate: payload.joiningDate !== undefined ? (payload.joiningDate ? new Date(`${payload.joiningDate}T00:00:00.000Z`) : null) : existing.joiningDate,
      completionDate: payload.completionDate !== undefined ? (payload.completionDate ? new Date(`${payload.completionDate}T00:00:00.000Z`) : null) : existing.completionDate,
      note: payload.note !== undefined ? payload.note?.trim() || null : existing.note
    }
  });

  await createAuditLog({
    userId,
    studentId: updated.studentId,
    module: "placement",
    action: "UPDATE_PLACEMENT",
    metadata: {
      placementId: updated.id,
      placementStatus: updated.placementStatus,
      apprenticeshipStatus: updated.apprenticeshipStatus
    }
  });

  return updated;
}
