import { AdmissionMode, EnquirySource, EnquiryStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function toCapitalizedWords(value?: string | null) {
  if (!value) return null;
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function toUpperWords(value?: string | null) {
  if (!value) return null;
  return value.trim().toUpperCase();
}

function parseDateOnly(value?: string | null) {
  if (!value?.trim()) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return date;
}

export function formatDateOnly(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export type EnquiryListFilters = {
  search?: string;
  status?: string;
};

export async function listEnquiries(filters: EnquiryListFilters = {}) {
  const where: Prisma.EnquiryWhereInput = {};

  if (filters.status) {
    where.status = filters.status as EnquiryStatus;
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim();
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { mobile: { contains: search } },
      { parentMobile: { contains: search } },
      { assignedCounsellor: { contains: search, mode: "insensitive" } }
    ];
  }

  const [rows, grouped] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      orderBy: [{ status: "asc" }, { enquiryDate: "desc" }, { createdAt: "desc" }]
    }),
    prisma.enquiry.groupBy({
      by: ["status"],
      _count: { _all: true }
    })
  ]);

  return {
    rows: rows.map((item) => ({
      id: item.id,
      fullName: item.fullName,
      mobile: item.mobile,
      parentMobile: item.parentMobile,
      instituteCode: item.instituteCode,
      tradeId: item.tradeId,
      qualification: item.qualification,
      category: item.category,
      address: item.address,
      source: item.source,
      enquiryDate: formatDateOnly(item.enquiryDate),
      status: item.status,
      nextFollowUpDate: formatDateOnly(item.nextFollowUpDate),
      lastContactDate: formatDateOnly(item.lastContactDate),
      assignedCounsellor: item.assignedCounsellor,
      budgetConcern: item.budgetConcern,
      scholarshipInterest: item.scholarshipInterest,
      admissionMode: item.admissionMode,
      agentName: item.agentName,
      notes: item.notes,
      followUpNotes: item.followUpNotes,
      lostReason: item.lostReason,
      convertedAt: item.convertedAt ? item.convertedAt.toISOString() : null,
      convertedStudentId: item.convertedStudentId,
      convertedStudentCode: item.convertedStudentCode
    })),
    summary: grouped.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {})
  };
}

export async function createEnquiry(payload: {
  fullName: string;
  mobile: string;
  parentMobile?: string;
  instituteCode?: string;
  tradeId?: string;
  qualification?: string;
  category?: string;
  address?: string;
  source: string;
  enquiryDate: string;
  status: string;
  nextFollowUpDate?: string;
  lastContactDate?: string;
  assignedCounsellor?: string;
  budgetConcern?: string;
  scholarshipInterest?: boolean;
  admissionMode?: string;
  agentName?: string;
  notes?: string;
  followUpNotes?: string;
  lostReason?: string;
  createdById?: string | null;
}) {
  const normalizedName = toUpperWords(payload.fullName) || payload.fullName;
  const duplicateThreshold = new Date();
  duplicateThreshold.setDate(duplicateThreshold.getDate() - 7);
  const possibleDuplicate = await prisma.enquiry.findFirst({
    where: {
      mobile: payload.mobile.trim(),
      fullName: normalizedName,
      status: {
        in: [
          EnquiryStatus.NEW,
          EnquiryStatus.FOLLOW_UP,
          EnquiryStatus.VISIT_SCHEDULED,
          EnquiryStatus.COUNSELLED,
          EnquiryStatus.INTERESTED,
          EnquiryStatus.DOCUMENTS_PENDING
        ]
      },
      createdAt: {
        gte: duplicateThreshold
      }
    },
    select: {
      id: true,
      status: true,
      enquiryDate: true
    }
  });
  if (possibleDuplicate) {
    throw new Error(
      `Possible duplicate enquiry already exists (${possibleDuplicate.status}, ${formatDateOnly(possibleDuplicate.enquiryDate)}).`
    );
  }

  return prisma.enquiry.create({
    data: {
      fullName: normalizedName,
      mobile: payload.mobile.trim(),
      parentMobile: payload.parentMobile?.trim() || null,
      instituteCode: payload.instituteCode?.trim() || null,
      tradeId: payload.tradeId?.trim() || null,
      qualification: payload.qualification?.trim() || null,
      category: toCapitalizedWords(payload.category) || null,
      address: toCapitalizedWords(payload.address) || null,
      source: payload.source as EnquirySource,
      enquiryDate: parseDateOnly(payload.enquiryDate) ?? new Date(),
      status: payload.status as EnquiryStatus,
      nextFollowUpDate: parseDateOnly(payload.nextFollowUpDate),
      lastContactDate: parseDateOnly(payload.lastContactDate),
      assignedCounsellor: toCapitalizedWords(payload.assignedCounsellor) || null,
      budgetConcern: toCapitalizedWords(payload.budgetConcern) || null,
      scholarshipInterest: Boolean(payload.scholarshipInterest),
      admissionMode: payload.admissionMode ? (payload.admissionMode as AdmissionMode) : null,
      agentName: toCapitalizedWords(payload.agentName) || null,
      notes: payload.notes?.trim() || null,
      followUpNotes: payload.followUpNotes?.trim() || null,
      lostReason: payload.lostReason?.trim() || null,
      createdById: payload.createdById || null
    }
  });
}

export async function updateEnquiry(enquiryId: string, payload: {
  status?: string;
  nextFollowUpDate?: string;
  lastContactDate?: string;
  assignedCounsellor?: string;
  followUpNotes?: string;
  lostReason?: string;
  budgetConcern?: string;
  notes?: string;
}) {
  return prisma.enquiry.update({
    where: { id: enquiryId },
    data: {
      status: payload.status ? (payload.status as EnquiryStatus) : undefined,
      nextFollowUpDate: payload.nextFollowUpDate !== undefined ? parseDateOnly(payload.nextFollowUpDate) : undefined,
      lastContactDate: payload.lastContactDate !== undefined ? parseDateOnly(payload.lastContactDate) : undefined,
      assignedCounsellor: payload.assignedCounsellor !== undefined ? toCapitalizedWords(payload.assignedCounsellor) : undefined,
      followUpNotes: payload.followUpNotes !== undefined ? payload.followUpNotes.trim() || null : undefined,
      lostReason: payload.lostReason !== undefined ? payload.lostReason.trim() || null : undefined,
      budgetConcern: payload.budgetConcern !== undefined ? toCapitalizedWords(payload.budgetConcern) : undefined,
      notes: payload.notes !== undefined ? payload.notes.trim() || null : undefined
    }
  });
}

export async function markEnquiryConverted(enquiryId: string, student: { id: string; studentCode: string }) {
  await prisma.enquiry.update({
    where: { id: enquiryId },
    data: {
      status: EnquiryStatus.CONVERTED,
      convertedAt: new Date(),
      convertedStudentId: student.id,
      convertedStudentCode: student.studentCode
    }
  });
}

