import { VerificationStatus } from "@prisma/client";
import { readClassificationMasters } from "@/lib/classification-masters";
import { tradeUnitCatalog } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { buildSessionVariants, normalizeSessionLabel, readSessionConfig } from "@/lib/session-config";
import {
  buildTradeCycleSessionVariants,
  countTwoYearConcurrentSeatUsers,
  getUnitAvailability,
  workshopSeatLifecycleWhere
} from "@/lib/services/admission-service";
import type { SelectOption } from "@/lib/types";

export type AdmissionDeskFilters = {
  search?: string;
  instituteCode?: string;
  tradeValue?: string;
  session?: string;
  yearLabel?: string;
  category?: string;
  status?: string;
  assignment?: string;
  unitNumber?: string;
  view?: string;
};

export type AdmissionDeskData = {
  metrics: {
    totalInquiries: number;
    totalAdmissions: number;
    pendingDocuments: number;
    canceledAdmissions: number;
    vacantSeats: number;
  };
  tradeWiseAdmissions: Array<{
    label: string;
    count: number;
  }>;
  sessionWiseAdmissions: Array<{
    label: string;
    count: number;
  }>;
  yearWiseAdmissions: Array<{
    label: string;
    count: number;
  }>;
  seatView: Array<{
    instituteCode: string;
    instituteName: string;
    tradeName: string;
    tradeValue: string;
    session: string;
    yearLabel: string;
    totalCapacity: number;
    usedSeats: number;
    vacantSeats: number;
    unassignedSeats: number;
    units: Array<{
      unitNumber: number;
      capacity: number;
      used: number;
      remaining: number;
      isFull: boolean;
    }>;
  }>;
  rows: Array<{
    id: string;
    studentCode: string;
    fullName: string;
    instituteName: string;
    instituteCode: string;
    tradeName: string;
    tradeValue: string;
    session: string;
    yearLabel: string;
    category: string | null;
    status: string;
    admissionStatusLabel: string | null;
    lifecycleStage: string;
    documentsStatus: string;
    mobile: string;
    unitNumber: number | null;
    createdAt: string;
  }>;
  options: {
    institutes: SelectOption[];
    trades: SelectOption[];
    sessions: SelectOption[];
    years: SelectOption[];
    categories: SelectOption[];
    statuses: SelectOption[];
  };
};

function normalizeSearch(search?: string) {
  return (search || "").trim();
}

function buildStudentWhere(filters: AdmissionDeskFilters) {
  const search = normalizeSearch(filters.search);
  const [tradeInstituteCode, tradeCode] = (filters.tradeValue || "").split("::");
  const tradeValue = tradeInstituteCode && tradeCode ? `${tradeInstituteCode}::${tradeCode}` : "";
  const tradeConfig = tradeValue ? tradeUnitCatalog[tradeValue] : null;
  const sessionVariants =
    filters.session && tradeConfig
      ? buildTradeCycleSessionVariants(filters.session, tradeConfig.durationYears)
      : buildSessionVariants(filters.session);

  return {
    deletedAt: null,
    ...(sessionVariants.length ? { session: { in: sessionVariants } } : {}),
    ...(filters.yearLabel && filters.yearLabel !== "CYCLE" ? { yearLabel: filters.yearLabel } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.status ? { admissionStatusLabel: filters.status } : {}),
    ...(filters.assignment === "unassigned"
      ? { unitNumber: null }
      : filters.assignment === "assigned"
        ? { NOT: { unitNumber: null } }
        : {}),
    ...(filters.unitNumber ? { unitNumber: Number(filters.unitNumber) || undefined } : {}),
    ...(filters.instituteCode
      ? {
          institute: {
            instituteCode: filters.instituteCode
          }
        }
      : {}),
    ...(tradeInstituteCode && tradeCode
      ? {
          institute: {
            instituteCode: tradeInstituteCode
          },
          trade: {
            tradeCode
          }
        }
      : {}),
    ...(search
      ? {
          OR: [
            { fullName: { startsWith: search, mode: "insensitive" as const } },
            { studentCode: { startsWith: search, mode: "insensitive" as const } },
            { mobile: { startsWith: search, mode: "insensitive" as const } },
            { fatherName: { startsWith: search, mode: "insensitive" as const } }
          ]
        }
      : {})
  };
}

export async function getAdmissionDeskData(filters: AdmissionDeskFilters = {}): Promise<AdmissionDeskData> {
  const studentWhere = buildStudentWhere(filters);
  const sessionConfig = await readSessionConfig();
  const activeSessions = [sessionConfig.activeOneYearSession, sessionConfig.activeTwoYearSession].filter(Boolean);

  const [
    classificationMasters,
    institutes,
    trades,
    totalInquiries,
    totalAdmissions,
    pendingDocuments,
    canceledAdmissions,
    students,
    groupedByTrade,
    groupedBySession,
    groupedByYear,
    distinctSessionRows
  ] = await Promise.all([
      readClassificationMasters(),
      prisma.institute.findMany({
        where: { status: true },
        orderBy: { instituteCode: "asc" }
      }),
      prisma.trade.findMany({
        where: { isActive: true },
        include: {
          institute: true
        },
        orderBy: [{ institute: { instituteCode: "asc" } }, { tradeCode: "asc" }]
      }),
      prisma.enquiry.count(),
      prisma.student.count({ where: studentWhere }),
      prisma.student.count({
        where: {
          ...studentWhere,
          documentsStatus: {
            in: [VerificationStatus.PENDING, VerificationStatus.INCOMPLETE]
          }
        }
      }),
      prisma.student.count({
        where: {
          ...studentWhere,
          admissionStatusLabel: "CANCELED"
        }
      }),
      prisma.student.findMany({
        where: studentWhere,
        include: {
          institute: true,
          trade: true
        },
        orderBy: { createdAt: "desc" },
        take: 100
      }),
      prisma.student.groupBy({
        by: ["tradeId"],
        where: {
          ...studentWhere
        },
        _count: {
          _all: true
        }
      }),
      prisma.student.groupBy({
        by: ["session"],
        where: {
          ...studentWhere
        },
        _count: {
          _all: true
        }
      }),
      prisma.student.groupBy({
        by: ["yearLabel"],
        where: {
          ...studentWhere
        },
        _count: {
          _all: true
        }
      }),
      prisma.student.findMany({
        where: { deletedAt: null },
        distinct: ["session"],
        select: { session: true },
        orderBy: { session: "desc" }
      })
    ]);

  const tradeCountMap = new Map(groupedByTrade.map((item) => [item.tradeId, item._count._all]));
  const tradeLookup = new Map(trades.map((item) => [item.id, item]));

  const tradeCandidates = trades
    .filter((trade) => !filters.instituteCode || trade.institute.instituteCode === filters.instituteCode)
    .filter(
      (trade) =>
        !filters.tradeValue ||
        `${trade.institute.instituteCode}::${trade.tradeCode}` === filters.tradeValue
    )
    .slice(0, 8);

  const seatView = await Promise.all(
    tradeCandidates.map(async (trade) => {
      const tradeValue = `${trade.institute.instituteCode}::${trade.tradeCode}`;
      const seatConfig = tradeUnitCatalog[tradeValue];
      const tradeSession =
        filters.session ||
        (seatConfig?.durationYears === 1
          ? sessionConfig.activeOneYearSession
          : sessionConfig.activeTwoYearSession) ||
        "";
      const tradeYearLabel =
        seatConfig?.durationYears === 1 ? filters.yearLabel || "1st" : "CYCLE";
      const cycleSessionVariants = buildTradeCycleSessionVariants(tradeSession, seatConfig?.durationYears || 1);
      const units = tradeSession
        ? await getUnitAvailability(tradeValue, tradeSession, tradeYearLabel)
        : [];
      const totalCapacity = units.reduce((sum, item) => sum + item.capacity, 0);
      const groupedUsedSeats = units.reduce((sum, item) => sum + item.used, 0);
      const usedSeats =
        seatConfig?.durationYears === 2 && tradeSession
          ? await countTwoYearConcurrentSeatUsers(trade.instituteId, trade.id, tradeSession)
          : await prisma.student.count({
              where: {
                deletedAt: null,
                ...workshopSeatLifecycleWhere,
                institute: {
                  instituteCode: trade.institute.instituteCode
                },
                trade: {
                  tradeCode: trade.tradeCode
                },
                ...(cycleSessionVariants.length ? { session: { in: cycleSessionVariants } } : {}),
                ...(seatConfig?.durationYears === 1 ? { yearLabel: filters.yearLabel || "1st" } : {})
              }
            });
      const unassignedSeats = Math.max(usedSeats - groupedUsedSeats, 0);
      const vacant = Math.max(totalCapacity - usedSeats, 0);

      return {
        instituteCode: trade.institute.instituteCode,
        instituteName: trade.institute.name,
        tradeName: trade.name,
        tradeValue,
        session: tradeSession,
        yearLabel: tradeYearLabel,
        totalCapacity,
        usedSeats,
        vacantSeats: vacant,
        unassignedSeats,
        units
      };
    })
  );

  const vacantSeats = seatView.reduce((sum, item) => sum + item.vacantSeats, 0);

  return {
    metrics: {
      totalInquiries,
      totalAdmissions,
      pendingDocuments,
      canceledAdmissions,
      vacantSeats
    },
    tradeWiseAdmissions: groupedByTrade
      .map((item) => ({
        label: tradeLookup.get(item.tradeId)?.name || "Unknown Trade",
        count: item._count._all
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8),
    sessionWiseAdmissions: groupedBySession
      .map((item) => ({
        label: normalizeSessionLabel(item.session),
        count: item._count._all
      }))
      .sort((left, right) => right.label.localeCompare(left.label)),
    yearWiseAdmissions: groupedByYear
      .map((item) => ({
        label: item.yearLabel,
        count: item._count._all
      }))
      .sort((left, right) => left.label.localeCompare(right.label)),
    seatView,
    rows: students.map((item) => ({
      id: item.id,
      studentCode: item.studentCode,
      fullName: item.fullName,
      instituteName: item.institute.name,
      instituteCode: item.institute.instituteCode,
      tradeName: item.trade.name,
      tradeValue: `${item.institute.instituteCode}::${item.trade.tradeCode}`,
      session: item.session,
      yearLabel: item.yearLabel,
      category: item.category,
      status: item.status,
      admissionStatusLabel: item.admissionStatusLabel,
      lifecycleStage: item.lifecycleStage,
      documentsStatus: item.documentsStatus,
      mobile: item.mobile,
      unitNumber: item.unitNumber,
      createdAt: item.createdAt.toISOString()
    })),
    options: {
      institutes: institutes.map((item) => ({
        label: `${item.instituteCode} - ${item.name}`,
        value: item.instituteCode
      })),
      trades: trades.map((item) => ({
        label: `${item.institute.instituteCode} - ${item.name}`,
        value: `${item.institute.instituteCode}::${item.tradeCode}`
      })),
      sessions: Array.from(
        new Set(
          distinctSessionRows
            .map((item) => item.session)
            .concat(students.map((item) => item.session))
            .concat(activeSessions)
        )
      )
        .filter(Boolean)
        .map((item) => normalizeSessionLabel(item))
        .filter(Boolean)
        .filter((item, index, array) => array.indexOf(item) === index)
        .sort((left, right) => right.localeCompare(left))
        .map((item) => ({ label: item, value: item })),
      years: [
        { label: "1st Year", value: "1st" },
        { label: "2nd Year", value: "2nd" }
      ],
      categories: classificationMasters.categories,
      statuses: [
        { label: "Inquiry", value: "INQUIRY" },
        { label: "Registered", value: "REGISTERED" },
        { label: "Documents Pending", value: "DOCUMENTS_PENDING" },
        { label: "Admitted", value: "ADMITTED" },
        { label: "Provisionally Admitted", value: "PROVISIONALLY_ADMITTED" },
        { label: "Canceled", value: "CANCELED" },
        { label: "Dropped", value: "DROPPED" },
        { label: "Transferred", value: "TRANSFERRED" }
      ]
    }
  };
}
