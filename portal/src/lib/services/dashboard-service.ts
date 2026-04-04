import {
  DocumentTypeCode,
  EnquiryStatus,
  ScholarshipStatus,
  StudentLifecycleStage,
  VerificationStatus
} from "@prisma/client";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { formatInr } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { buildSessionVariants, readSessionConfig } from "@/lib/session-config";
import type { DashboardMetric } from "@/lib/types";

const prismaAny = prisma as any;
/** Longer TTL helps layout + home page share work within one navigation (same request + warm cache). */
const DASHBOARD_CACHE_TTL_MS = 60_000;

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

type DashboardInsights = {
  managementCards: Array<{ label: string; value: string; helper: string }>;
  trend: Array<{ month: string; admissions: number; enquiries: number; conversions: number; conversionRate: number }>;
  instituteComparison: Array<{ institute: string; code: string; totalStudents: number; docsPending: number; feeDueCases: number }>;
  tradeDemand: Array<{ trade: string; institute: string; admissions: number; enquiries: number }>;
  sessionFinancials: Array<{ session: string; totalStudents: number; collections: number; dueAmount: number }>;
};

const dashboardMetricsCache = new Map<string, CacheEntry<DashboardMetric[]>>();
const dashboardInsightsCache = new Map<string, CacheEntry<DashboardInsights>>();

function buildInstituteKey(instituteCode?: string | null, instituteName?: string | null) {
  const code = String(instituteCode || "").trim();
  if (code) return `CODE:${code.toUpperCase()}`;
  const name = String(instituteName || "").trim().toLowerCase();
  return `NAME:${name}`;
}

function toSafeNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toLocalDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getCache<T>(store: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(store: Map<string, CacheEntry<T>>, key: string, data: T) {
  store.set(key, {
    data,
    expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS
  });
}

/**
 * Dashboard cards filter by "active" session variants. Bulk CSV imports often use a session
 * string that does not match those variants, which made every count 0. When ALL_ACTIVE is selected
 * and no student matches the strict list but students exist, widen to all distinct session values.
 */
async function resolveDashboardSessionsForFilter(params: {
  selectedSession?: string | null;
  sessionConfig: { activeOneYearSession: string; activeTwoYearSession: string };
}): Promise<string[]> {
  const activeSessions = [
    params.sessionConfig.activeOneYearSession,
    params.sessionConfig.activeTwoYearSession
  ].filter(Boolean);
  const sessionBase =
    params.selectedSession && params.selectedSession !== "ALL_ACTIVE"
      ? [params.selectedSession]
      : activeSessions;

  let dashboardSessions = Array.from(
    new Set(sessionBase.flatMap((item) => buildSessionVariants(item)))
  ).filter(Boolean);

  const allActiveMode = !params.selectedSession || params.selectedSession === "ALL_ACTIVE";

  async function widenFromAllStudents(): Promise<string[]> {
    const rows = await prisma.student.findMany({
      where: { deletedAt: null },
      distinct: ["session"],
      select: { session: true }
    });
    const widen = new Set<string>();
    for (const r of rows) {
      buildSessionVariants(r.session).forEach((v) => {
        if (v) widen.add(v);
      });
    }
    return Array.from(widen).filter(Boolean);
  }

  if (!dashboardSessions.length) {
    const total = await prisma.student.count({ where: { deletedAt: null } });
    if (total > 0) return widenFromAllStudents();
    return [];
  }

  if (!allActiveMode) {
    return dashboardSessions;
  }

  const totalAny = await prisma.student.count({ where: { deletedAt: null } });
  const strictCount = await prisma.student.count({
    where: { deletedAt: null, session: { in: dashboardSessions } }
  });

  if (totalAny > 0 && strictCount === 0) {
    return widenFromAllStudents();
  }

  return dashboardSessions;
}

async function fetchDashboardMetrics(selectedSession?: string | null): Promise<DashboardMetric[]> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const sessionKey = selectedSession && selectedSession !== "ALL_ACTIVE" ? selectedSession : "ALL_ACTIVE";
  const dayKey = toLocalDayKey(startOfToday);
  const cacheKey = `${sessionKey}:${dayKey}`;
  const cached = getCache(dashboardMetricsCache, cacheKey);
  if (cached) return cached;

  const sessionConfig = await readSessionConfig();
  const dashboardSessions = await resolveDashboardSessionsForFilter({
    selectedSession,
    sessionConfig
  });
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const todayDateOnly = new Date();
  todayDateOnly.setHours(0, 0, 0, 0);

  const [
    totalStudents,
    pendingAdmissions,
    docsPending,
    photoUploadQueue,
    eligibilityPending,
    feeDueCases,
    todayEnquiries,
    followUpEnquiries,
    scholarshipQueries,
    prnPending,
    scvtPending,
    todayFeeTransactions,
    todayAccountEntries,
    sessionStudentScope
  ] = await Promise.all([
    prisma.student.count({
      where: {
        deletedAt: null,
        session: {
          in: dashboardSessions
        }
      }
    }),
    prisma.student.count({
      where: {
        deletedAt: null,
        session: {
          in: dashboardSessions
        },
        status: {
          in: ["DRAFT", "IN_PROGRESS", "UNDER_REVIEW"]
        }
      }
    }),
    prisma.student.count({
      where: {
        deletedAt: null,
        session: {
          in: dashboardSessions
        },
        documentsStatus: {
          in: [VerificationStatus.PENDING, VerificationStatus.INCOMPLETE]
        }
      }
    }),
    prisma.student.count({
      where: {
        deletedAt: null,
        session: { in: dashboardSessions },
        lifecycleStage: { in: [StudentLifecycleStage.ACTIVE, StudentLifecycleStage.PROMOTED] },
        documentsStatus: { not: VerificationStatus.VERIFIED },
        NOT: {
          documents: {
            some: {
              deletedAt: null,
              documentType: DocumentTypeCode.STUDENT_PHOTO
            }
          }
        }
      }
    }),
    prisma.student.count({
      where: {
        deletedAt: null,
        session: {
          in: dashboardSessions
        },
        eligibilityStatus: VerificationStatus.PENDING
      }
    }),
    prisma.feeProfile.count({
      where: {
        dueAmount: {
          gt: 0
        },
        student: {
          deletedAt: null,
          session: {
            in: dashboardSessions
          }
        }
      }
    }),
    prisma.enquiry.findMany({
      where: {
        enquiryDate: {
          gte: startOfToday,
          lte: endOfToday
        }
      },
      select: {
        instituteCode: true,
        tradeId: true
      }
    }),
    prisma.enquiry.findMany({
      where: {
        nextFollowUpDate: {
          lte: todayDateOnly
        },
        status: {
          in: [
            EnquiryStatus.NEW,
            EnquiryStatus.FOLLOW_UP,
            EnquiryStatus.VISIT_SCHEDULED,
            EnquiryStatus.COUNSELLED,
            EnquiryStatus.INTERESTED,
            EnquiryStatus.DOCUMENTS_PENDING
          ]
        }
      },
      select: {
        instituteCode: true,
        tradeId: true
      }
    }),
    prisma.scholarshipRecord.count({
      where: {
        student: {
          deletedAt: null,
          session: {
            in: dashboardSessions
          }
        },
        status: ScholarshipStatus.QUERY_BY_DEPARTMENT
      }
    }),
    prisma.student.count({
      where: {
        deletedAt: null,
        session: {
          in: dashboardSessions
        },
        OR: [
          { prnScvtRecord: { is: null } },
          { prnScvtRecord: { is: { prnNumber: null } } }
        ]
      }
    }),
    prisma.student.count({
      where: {
        deletedAt: null,
        session: {
          in: dashboardSessions
        },
        OR: [
          { prnScvtRecord: { is: null } },
          { prnScvtRecord: { is: { scvtRegistrationNumber: null } } }
        ]
      }
    }),
    prisma.feeTransaction.findMany({
      where: {
        transactionDate: {
          gte: startOfToday,
          lte: endOfToday
        },
        student: {
          deletedAt: null,
          session: {
            in: dashboardSessions
          }
        }
      },
      select: {
        amountPaid: true,
        paymentMode: true
      }
    }),
    prisma.accountEntry.findMany({
      where: {
        entryDate: {
          gte: startOfToday,
          lte: endOfToday
        }
      },
      select: {
        entryType: true,
        amount: true,
        paymentMode: true
      }
    }),
    prisma.student.findMany({
      where: {
        deletedAt: null,
        session: {
          in: dashboardSessions
        }
      },
      distinct: ["instituteId", "tradeId"],
      select: {
        instituteId: true,
        tradeId: true,
        institute: {
          select: {
            instituteCode: true
          }
        }
      }
    })
  ]);

  const scopedInstituteCodes = new Set(
    sessionStudentScope
      .map((row) => String(row.institute.instituteCode || "").trim().toUpperCase())
      .filter(Boolean)
  );
  const scopedTradeIds = new Set(sessionStudentScope.map((row) => row.tradeId));
  const isScopedEnquiry = (row: { instituteCode: string | null; tradeId: string | null }) =>
    (row.tradeId && scopedTradeIds.has(row.tradeId)) ||
    (row.instituteCode && scopedInstituteCodes.has(String(row.instituteCode).trim().toUpperCase()));
  const newEnquiries = todayEnquiries.filter(isScopedEnquiry).length;
  const followUpsDue = followUpEnquiries.filter(isScopedEnquiry).length;

  const todayPaymentModeTotals = {
    CASH: 0,
    UPI: 0,
    ONLINE: 0,
    BANK_TRANSFER: 0,
    AGENT_COLLECTION: 0
  };

  let todayAvailableCash = 0;

  for (const item of todayFeeTransactions) {
    const amount = toSafeNumber(item.amountPaid);
    const mode = item.paymentMode || "CASH";
    if (mode in todayPaymentModeTotals) {
      todayPaymentModeTotals[mode as keyof typeof todayPaymentModeTotals] += amount;
    }
    if (mode === "CASH") {
      todayAvailableCash += amount;
    }
  }

  for (const item of todayAccountEntries) {
    const amount = toSafeNumber(item.amount);
    const mode = item.paymentMode || "CASH";
    if (mode in todayPaymentModeTotals) {
      todayPaymentModeTotals[mode as keyof typeof todayPaymentModeTotals] += amount;
    }

    if (item.entryType === "INCOME" && mode === "CASH") {
      todayAvailableCash += amount;
    }

    if (item.entryType === "EXPENSE" && mode === "CASH") {
      todayAvailableCash -= amount;
    }

    if (item.entryType === "BANK_DEPOSIT") {
      todayAvailableCash -= amount;
    }
  }

  const paymentModeHelperBase = `Cash ₹${todayPaymentModeTotals.CASH.toFixed(0)} | UPI ₹${todayPaymentModeTotals.UPI.toFixed(0)} | Online ₹${todayPaymentModeTotals.ONLINE.toFixed(0)}`;
  const paymentModeHelper =
    selectedSession && selectedSession !== "ALL_ACTIVE"
      ? `${paymentModeHelperBase} (institute-wide cashflow)`
      : paymentModeHelperBase;
  const sessionLabel =
    selectedSession && selectedSession !== "ALL_ACTIVE"
      ? selectedSession
      : `${sessionConfig.activeOneYearSession} / ${sessionConfig.activeTwoYearSession}`;

  const metrics: DashboardMetric[] = [
    { label: "Active Sessions", value: sessionLabel, helper: selectedSession && selectedSession !== "ALL_ACTIVE" ? "Dashboard filtered to selected session" : "1-year / 2-year current admission sessions" },
    { label: "Total Students", value: String(totalStudents), helper: "All admissions in dashboard session view" },
    { label: "Pending Admissions", value: String(pendingAdmissions), helper: "Not fully completed" },
    { label: "Docs Pending", value: String(docsPending), helper: "Requires document review" },
    {
      label: "Photo Upload Queue",
      value: String(photoUploadQueue),
      helper: "Active students missing photo while documents not verified"
    },
    { label: "10th Check Pending", value: String(eligibilityPending), helper: "Eligibility not verified" },
    { label: "Fee Due Cases", value: String(feeDueCases), helper: "Outstanding balance exists" },
    { label: "New Enquiries", value: String(newEnquiries), helper: "Captured today in enquiry desk" },
    { label: "Follow-Ups Due", value: String(followUpsDue), helper: "Enquiry callbacks due today or earlier" },
    { label: "Scholarship Queries", value: String(scholarshipQueries), helper: "Query by department" },
    { label: "PRN Pending", value: String(prnPending), helper: "Registration still missing" },
    { label: "SCVT Pending", value: String(scvtPending), helper: "SCVT registration not updated" },
    { label: "Today's Available Cash", value: todayAvailableCash.toFixed(2), helper: paymentModeHelper }
  ];

  setCache(dashboardMetricsCache, cacheKey, metrics);
  return metrics;
}

/**
 * Sidebar queue badges only (ALL_ACTIVE sessions). Skips eligibility + today's cash queries so
 * layout renders faster than full `getDashboardMetrics` on every navigation.
 */
async function fetchSidebarQueueBadges(): Promise<DashboardMetric[]> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const sessionConfig = await readSessionConfig();
  const dashboardSessions = await resolveDashboardSessionsForFilter({
    selectedSession: "ALL_ACTIVE",
    sessionConfig
  });
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const todayDateOnly = new Date();
  todayDateOnly.setHours(0, 0, 0, 0);

  const [
    totalStudents,
    pendingAdmissions,
    docsPending,
    feeDueCases,
    todayEnquiries,
    followUpEnquiries,
    scholarshipQueries,
    prnPending,
    scvtPending,
    sessionStudentScope
  ] = await Promise.all([
    prisma.student.count({
      where: {
        deletedAt: null,
        session: { in: dashboardSessions }
      }
    }),
    prisma.student.count({
      where: {
        deletedAt: null,
        session: { in: dashboardSessions },
        status: { in: ["DRAFT", "IN_PROGRESS", "UNDER_REVIEW"] }
      }
    }),
    prisma.student.count({
      where: {
        deletedAt: null,
        session: { in: dashboardSessions },
        documentsStatus: { in: [VerificationStatus.PENDING, VerificationStatus.INCOMPLETE] }
      }
    }),
    prisma.feeProfile.count({
      where: {
        dueAmount: { gt: 0 },
        student: { deletedAt: null, session: { in: dashboardSessions } }
      }
    }),
    prisma.enquiry.findMany({
      where: {
        enquiryDate: { gte: startOfToday, lte: endOfToday }
      },
      select: { instituteCode: true, tradeId: true }
    }),
    prisma.enquiry.findMany({
      where: {
        nextFollowUpDate: { lte: todayDateOnly },
        status: {
          in: [
            EnquiryStatus.NEW,
            EnquiryStatus.FOLLOW_UP,
            EnquiryStatus.VISIT_SCHEDULED,
            EnquiryStatus.COUNSELLED,
            EnquiryStatus.INTERESTED,
            EnquiryStatus.DOCUMENTS_PENDING
          ]
        }
      },
      select: { instituteCode: true, tradeId: true }
    }),
    prisma.scholarshipRecord.count({
      where: {
        student: { deletedAt: null, session: { in: dashboardSessions } },
        status: ScholarshipStatus.QUERY_BY_DEPARTMENT
      }
    }),
    prisma.student.count({
      where: {
        deletedAt: null,
        session: { in: dashboardSessions },
        OR: [{ prnScvtRecord: { is: null } }, { prnScvtRecord: { is: { prnNumber: null } } }]
      }
    }),
    prisma.student.count({
      where: {
        deletedAt: null,
        session: { in: dashboardSessions },
        OR: [{ prnScvtRecord: { is: null } }, { prnScvtRecord: { is: { scvtRegistrationNumber: null } } }]
      }
    }),
    prisma.student.findMany({
      where: { deletedAt: null, session: { in: dashboardSessions } },
      distinct: ["instituteId", "tradeId"],
      select: {
        tradeId: true,
        institute: { select: { instituteCode: true } }
      }
    })
  ]);

  const scopedInstituteCodes = new Set(
    sessionStudentScope
      .map((row) => String(row.institute.instituteCode || "").trim().toUpperCase())
      .filter(Boolean)
  );
  const scopedTradeIds = new Set(sessionStudentScope.map((row) => row.tradeId));
  const isScopedEnquiry = (row: { instituteCode: string | null; tradeId: string | null }) =>
    (row.tradeId && scopedTradeIds.has(row.tradeId)) ||
    (row.instituteCode && scopedInstituteCodes.has(String(row.instituteCode).trim().toUpperCase()));
  const newEnquiries = todayEnquiries.filter(isScopedEnquiry).length;
  const followUpsDue = followUpEnquiries.filter(isScopedEnquiry).length;

  const helper = "Queue depth for navigation";
  return [
    { label: "Total Students", value: String(totalStudents), helper },
    { label: "Pending Admissions", value: String(pendingAdmissions), helper },
    { label: "Docs Pending", value: String(docsPending), helper },
    { label: "Fee Due Cases", value: String(feeDueCases), helper },
    { label: "New Enquiries", value: String(newEnquiries), helper },
    { label: "Follow-Ups Due", value: String(followUpsDue), helper },
    { label: "Scholarship Queries", value: String(scholarshipQueries), helper },
    { label: "PRN Pending", value: String(prnPending), helper },
    { label: "SCVT Pending", value: String(scvtPending), helper }
  ];
}

export const getSidebarQueueBadges = cache(async () => {
  const dayKey = toLocalDayKey(new Date());
  return unstable_cache(
    async () => fetchSidebarQueueBadges(),
    ["portal-sidebar-queue-badges", dayKey],
    { revalidate: 120, tags: ["sidebar-badges", "dashboard-metrics"] }
  )();
});

function requestSessionKey(selectedSession?: string | null): string {
  if (!selectedSession || selectedSession === "ALL_ACTIVE") return "ALL_ACTIVE";
  return selectedSession;
}

/** Same-request dedupe (React cache) + cross-request cache on Vercel (`unstable_cache`). */
export const getDashboardMetrics = cache(async (selectedSession?: string | null) => {
  const rk = requestSessionKey(selectedSession);
  const dayKey = toLocalDayKey(new Date());
  return unstable_cache(
    async () => fetchDashboardMetrics(selectedSession),
    ["portal-dash-metrics", rk, dayKey],
    { revalidate: 60, tags: ["dashboard-metrics"] }
  )();
});

async function fetchDashboardInsights(selectedSession?: string | null): Promise<DashboardInsights> {
  const sessionKey = selectedSession && selectedSession !== "ALL_ACTIVE" ? selectedSession : "ALL_ACTIVE";
  const monthKey = toLocalMonthKey(new Date());
  const cacheKey = `${sessionKey}:${monthKey}`;
  const cached = getCache(dashboardInsightsCache, cacheKey);
  if (cached) return cached;

  const sessionConfig = await readSessionConfig();
  const dashboardSessions = await resolveDashboardSessionsForFilter({
    selectedSession,
    sessionConfig
  });

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  const [
    monthEnquiryRows,
    monthAdmissions,
    monthCertificates,
    joinedPlacements,
    activeStaffCount,
    pendingLeaveApprovals,
    monthlyFeeTransactions,
    monthlyAccountEntries,
    monthlyAdmissionsTrend,
    monthlyEnquiryTrend,
    insightStudents,
    feeCollectionsBySession,
    insightEnquiries,
    tradeRows
  ] = await Promise.all([
    prisma.enquiry.findMany({
      where: {
        enquiryDate: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      select: {
        enquiryDate: true,
        convertedAt: true,
        instituteCode: true,
        tradeId: true
      }
    }),
    prisma.student.count({
      where: {
        deletedAt: null,
        session: {
          in: dashboardSessions
        },
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    }),
    prisma.certificatePrintLog.count({
      where: {
        issueDate: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    }),
    prismaAny.placementRecord.count({
      where: {
        placementStatus: "JOINED",
        student: {
          deletedAt: null,
          session: {
            in: dashboardSessions
          }
        }
      }
    }),
    prisma.hrStaff.count({
      where: {
        isActive: true,
        isGovtRecordOnly: false
      }
    }),
    prismaAny.hrLeaveRecord.count({
      where: {
        status: "PENDING"
      }
    }),
    prisma.feeTransaction.findMany({
      where: {
        transactionDate: {
          gte: monthStart,
          lte: monthEnd
        },
        student: {
          deletedAt: null,
          session: {
            in: dashboardSessions
          }
        }
      },
      select: {
        amountPaid: true
      }
    }),
    prisma.accountEntry.findMany({
      where: {
        entryDate: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      select: {
        entryType: true,
        amount: true
      }
    }),
    prisma.student.findMany({
      where: {
        deletedAt: null,
        session: {
          in: dashboardSessions
        },
        createdAt: {
          gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1, 0, 0, 0, 0))
        }
      },
      select: {
        createdAt: true
      }
    }),
    prisma.enquiry.findMany({
      where: {
        enquiryDate: {
          gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1, 0, 0, 0, 0))
        }
      },
      select: {
        enquiryDate: true,
        convertedAt: true,
        instituteCode: true,
        tradeId: true
      }
    }),
    prisma.student.findMany({
      where: {
        deletedAt: null,
        session: {
          in: dashboardSessions
        }
      },
      select: {
        id: true,
        session: true,
        documentsStatus: true,
        institute: {
          select: {
            name: true,
            instituteCode: true
          }
        },
        trade: {
          select: {
            id: true,
            name: true
          }
        },
        feeProfile: {
          select: {
            dueAmount: true
          }
        }
      }
    }),
    Promise.all(
      dashboardSessions.map(async (session) => {
        const agg = await prisma.feeTransaction.aggregate({
          where: { student: { session, deletedAt: null } },
          _sum: { amountPaid: true }
        });
        return { session, total: toSafeNumber(agg._sum.amountPaid) };
      })
    ),
    prisma.enquiry.findMany({
      where: {
        OR: [
          {
            instituteCode: {
              not: null
            }
          },
          {
            tradeId: {
              not: null
            }
          }
        ]
      },
      select: {
        instituteCode: true,
        tradeId: true
      }
    }),
    prisma.trade.findMany({
      select: {
        id: true,
        name: true,
        institute: {
          select: {
            instituteCode: true,
            name: true
          }
        }
      }
    })
  ]);

  const monthlyCollections = monthlyFeeTransactions.reduce((sum, row) => sum + toSafeNumber(row.amountPaid), 0);
  const monthlyIncome = monthlyAccountEntries
    .filter((row) => row.entryType === "INCOME")
    .reduce((sum, row) => sum + toSafeNumber(row.amount), 0);
  const monthlyExpenses = monthlyAccountEntries
    .filter((row) => row.entryType === "EXPENSE")
    .reduce((sum, row) => sum + toSafeNumber(row.amount), 0);
  const monthlyBankDeposits = monthlyAccountEntries
    .filter((row) => row.entryType === "BANK_DEPOSIT")
    .reduce((sum, row) => sum + toSafeNumber(row.amount), 0);

  const trendBase = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
    const monthKey = date.toISOString().slice(0, 7);
    return {
      month: monthKey,
      admissions: 0,
      enquiries: 0,
      conversions: 0
    };
  });

  const trendMap = Object.fromEntries(trendBase.map((item) => [item.month, item]));
  const allowedInstituteCodes = new Set(
    insightStudents
      .map((student) => String(student.institute.instituteCode || "").trim().toUpperCase())
      .filter(Boolean)
  );
  const allowedTradeIds = new Set(insightStudents.map((student) => student.trade.id));
  const isAllowedEnquiry = (row: { instituteCode: string | null; tradeId: string | null }) =>
    (row.tradeId && allowedTradeIds.has(row.tradeId)) ||
    (row.instituteCode && allowedInstituteCodes.has(String(row.instituteCode).trim().toUpperCase()));
  const scopedMonthEnquiryRows = monthEnquiryRows.filter(isAllowedEnquiry);
  const scopedMonthlyEnquiryTrend = monthlyEnquiryTrend.filter(isAllowedEnquiry);
  const scopedInsightEnquiries = insightEnquiries.filter(isAllowedEnquiry);
  const monthEnquiries = scopedMonthEnquiryRows.length;
  const monthConvertedEnquiries = scopedMonthlyEnquiryTrend.filter(
    (row) => row.convertedAt && row.convertedAt >= monthStart && row.convertedAt <= monthEnd
  ).length;

  for (const row of monthlyAdmissionsTrend) {
    const key = row.createdAt.toISOString().slice(0, 7);
    if (trendMap[key]) {
      trendMap[key].admissions += 1;
    }
  }

  for (const row of scopedMonthlyEnquiryTrend) {
    const enquiryKey = row.enquiryDate.toISOString().slice(0, 7);
    if (trendMap[enquiryKey]) {
      trendMap[enquiryKey].enquiries += 1;
    }
    if (row.convertedAt) {
      const convertedKey = row.convertedAt.toISOString().slice(0, 7);
      if (trendMap[convertedKey]) {
        trendMap[convertedKey].conversions += 1;
      }
    }
  }

  const instituteMap = new Map<
    string,
    {
      institute: string;
      code: string;
      totalStudents: number;
      docsPending: number;
      feeDueCases: number;
    }
  >();

  const tradeMap = new Map<
    string,
    {
      trade: string;
      institute: string;
      admissions: number;
      enquiries: number;
    }
  >();

  const sessionMap = new Map<
    string,
    {
      session: string;
      totalStudents: number;
      collections: number;
      dueAmount: number;
    }
  >();

  const tradeInfoMap = new Map(
    tradeRows.map((trade) => [
      trade.id,
      {
        trade: trade.name,
        institute: trade.institute.instituteCode || trade.institute.name,
        instituteKey: buildInstituteKey(trade.institute.instituteCode, trade.institute.name)
      }
    ])
  );

  for (const student of insightStudents) {
    const instituteKey = buildInstituteKey(student.institute.instituteCode, student.institute.name);
    const currentInstitute = instituteMap.get(instituteKey) || {
      institute: student.institute.name,
      code: student.institute.instituteCode || "",
      totalStudents: 0,
      docsPending: 0,
      feeDueCases: 0
    };
    currentInstitute.totalStudents += 1;
    if (
      student.documentsStatus === VerificationStatus.PENDING ||
      student.documentsStatus === VerificationStatus.INCOMPLETE
    ) {
      currentInstitute.docsPending += 1;
    }
    if (toSafeNumber(student.feeProfile?.dueAmount) > 0) {
      currentInstitute.feeDueCases += 1;
    }
    instituteMap.set(instituteKey, currentInstitute);

    const tradeKey = `${student.trade.id}:${instituteKey}`;
    const currentTrade = tradeMap.get(tradeKey) || {
      trade: student.trade.name,
      institute: student.institute.instituteCode || student.institute.name,
      admissions: 0,
      enquiries: 0
    };
    currentTrade.admissions += 1;
    tradeMap.set(tradeKey, currentTrade);

    const currentSession = sessionMap.get(student.session) || {
      session: student.session,
      totalStudents: 0,
      collections: 0,
      dueAmount: 0
    };
    currentSession.totalStudents += 1;
    currentSession.dueAmount += toSafeNumber(student.feeProfile?.dueAmount);
    sessionMap.set(student.session, currentSession);
  }

  for (const { session, total } of feeCollectionsBySession) {
    const currentSession = sessionMap.get(session) || {
      session,
      totalStudents: 0,
      collections: 0,
      dueAmount: 0
    };
    currentSession.collections += total;
    sessionMap.set(session, currentSession);
  }

  for (const enquiry of scopedInsightEnquiries) {
    if (enquiry.tradeId) {
      const mappedTrade = tradeInfoMap.get(enquiry.tradeId);
      if (mappedTrade) {
        const tradeKey = `${enquiry.tradeId}:${mappedTrade.instituteKey}`;
        const currentTrade = tradeMap.get(tradeKey) || {
          trade: mappedTrade.trade,
          institute: mappedTrade.institute,
          admissions: 0,
          enquiries: 0
        };
        currentTrade.enquiries += 1;
        tradeMap.set(tradeKey, currentTrade);
      }
    }

    if (enquiry.instituteCode) {
      const instituteKey = buildInstituteKey(enquiry.instituteCode, null);
      const currentInstitute = instituteMap.get(instituteKey);
      if (!currentInstitute) {
        instituteMap.set(instituteKey, {
          institute: enquiry.instituteCode,
          code: enquiry.instituteCode,
          totalStudents: 0,
          docsPending: 0,
          feeDueCases: 0
        });
      }
    }
  }

  const insights = {
    managementCards: [
      {
        label: "This Month Collections",
        value: formatInr(monthlyCollections),
        helper: "Fee receipts collected this month"
      },
      {
        label: "This Month Expenses",
        value: formatInr(monthlyExpenses),
        helper: "Accounted expense entries this month"
      },
      {
        label: "Net Cashflow",
        value: formatInr(monthlyIncome + monthlyCollections - monthlyExpenses - monthlyBankDeposits),
        helper: "Income + fee collections minus expense and bank deposit movement"
      },
      {
        label: "Enquiry Conversion",
        value: monthEnquiries ? `${Math.round((monthConvertedEnquiries / monthEnquiries) * 100)}%` : "0%",
        helper: `${monthConvertedEnquiries} converted from ${monthEnquiries} enquiries this month`
      },
      {
        label: "Placement Joined",
        value: String(joinedPlacements),
        helper: "Students marked joined in placement desk"
      },
      {
        label: "Certificates Issued",
        value: String(monthCertificates),
        helper: "Certificates issued this month"
      },
      {
        label: "Active Staff",
        value: String(activeStaffCount),
        helper: "Current staff excluding govt-record-only entries"
      },
      {
        label: "Leave Approvals Pending",
        value: String(pendingLeaveApprovals),
        helper: "HR leave applications waiting for action"
      }
    ],
    trend: Object.values(trendMap).map((item) => ({
      ...item,
      conversionRate: item.enquiries ? Math.round((item.conversions / item.enquiries) * 100) : 0
    })),
    instituteComparison: Array.from(instituteMap.values())
      .sort((a, b) => b.totalStudents - a.totalStudents)
      .slice(0, 12),
    tradeDemand: Array.from(tradeMap.values())
      .sort((a, b) => b.admissions + b.enquiries - (a.admissions + a.enquiries))
      .slice(0, 8),
    sessionFinancials: Array.from(sessionMap.values())
      .sort((a, b) => a.session.localeCompare(b.session))
      .slice(0, 12)
  };

  setCache(dashboardInsightsCache, cacheKey, insights);
  return insights;
}

export const getDashboardInsights = cache(async (selectedSession?: string | null) => {
  const rk = requestSessionKey(selectedSession);
  const monthKey = toLocalMonthKey(new Date());
  return unstable_cache(
    async () => fetchDashboardInsights(selectedSession),
    ["portal-dash-insights", rk, monthKey],
    { revalidate: 90, tags: ["dashboard-insights"] }
  )();
});

export async function getDashboardDiagnostics(selectedSession?: string | null) {
  const sessionConfig = await readSessionConfig();
  const dashboardSessions = await resolveDashboardSessionsForFilter({
    selectedSession,
    sessionConfig
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  const trendStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1, 0, 0, 0, 0));

  const [
    sessionStudents,
    todayEnquiriesRaw,
    followUpsRaw,
    monthEnquiryRowsRaw,
    monthlyEnquiryTrendRaw,
    todayFeeTransactionsRaw,
    todayFeeTransactionsScoped,
    monthlyFeeTransactionsRaw,
    monthlyFeeTransactionsScoped
  ] = await Promise.all([
    prisma.student.findMany({
      where: { deletedAt: null, session: { in: dashboardSessions } },
      select: {
        id: true,
        tradeId: true,
        institute: { select: { instituteCode: true } }
      }
    }),
    prisma.enquiry.findMany({
      where: {
        enquiryDate: {
          gte: startOfToday,
          lte: endOfToday
        }
      },
      select: { instituteCode: true, tradeId: true }
    }),
    prisma.enquiry.findMany({
      where: {
        nextFollowUpDate: { lte: startOfToday },
        status: {
          in: [
            EnquiryStatus.NEW,
            EnquiryStatus.FOLLOW_UP,
            EnquiryStatus.VISIT_SCHEDULED,
            EnquiryStatus.COUNSELLED,
            EnquiryStatus.INTERESTED,
            EnquiryStatus.DOCUMENTS_PENDING
          ]
        }
      },
      select: { instituteCode: true, tradeId: true }
    }),
    prisma.enquiry.findMany({
      where: {
        enquiryDate: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      select: { enquiryDate: true, convertedAt: true, instituteCode: true, tradeId: true }
    }),
    prisma.enquiry.findMany({
      where: {
        enquiryDate: {
          gte: trendStart
        }
      },
      select: { enquiryDate: true, convertedAt: true, instituteCode: true, tradeId: true }
    }),
    prisma.feeTransaction.findMany({
      where: {
        transactionDate: {
          gte: startOfToday,
          lte: endOfToday
        }
      },
      select: { amountPaid: true }
    }),
    prisma.feeTransaction.findMany({
      where: {
        transactionDate: {
          gte: startOfToday,
          lte: endOfToday
        },
        student: {
          deletedAt: null,
          session: {
            in: dashboardSessions
          }
        }
      },
      select: { amountPaid: true }
    }),
    prisma.feeTransaction.findMany({
      where: {
        transactionDate: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      select: { amountPaid: true }
    }),
    prisma.feeTransaction.findMany({
      where: {
        transactionDate: {
          gte: monthStart,
          lte: monthEnd
        },
        student: {
          deletedAt: null,
          session: {
            in: dashboardSessions
          }
        }
      },
      select: { amountPaid: true }
    })
  ]);

  const allowedInstituteCodes = new Set(
    sessionStudents
      .map((student) => String(student.institute.instituteCode || "").trim().toUpperCase())
      .filter(Boolean)
  );
  const allowedTradeIds = new Set(sessionStudents.map((student) => student.tradeId));
  const isScopedEnquiry = (row: { instituteCode: string | null; tradeId: string | null }) =>
    (row.tradeId && allowedTradeIds.has(row.tradeId)) ||
    (row.instituteCode && allowedInstituteCodes.has(String(row.instituteCode).trim().toUpperCase()));

  const todayEnquiriesScoped = todayEnquiriesRaw.filter(isScopedEnquiry);
  const followUpsScoped = followUpsRaw.filter(isScopedEnquiry);
  const monthEnquiryRowsScoped = monthEnquiryRowsRaw.filter(isScopedEnquiry);
  const monthlyEnquiryTrendScoped = monthlyEnquiryTrendRaw.filter(isScopedEnquiry);

  return {
    selectedSession: selectedSession || "ALL_ACTIVE",
    dashboardSessions,
    sessionStudentScope: {
      students: sessionStudents.length,
      instituteCodes: allowedInstituteCodes.size,
      tradeIds: allowedTradeIds.size
    },
    enquiries: {
      today: {
        raw: todayEnquiriesRaw.length,
        scoped: todayEnquiriesScoped.length
      },
      followUpsDue: {
        raw: followUpsRaw.length,
        scoped: followUpsScoped.length
      },
      month: {
        raw: monthEnquiryRowsRaw.length,
        scoped: monthEnquiryRowsScoped.length
      },
      monthConverted: {
        raw: monthEnquiryRowsRaw.filter((row) => row.convertedAt && row.convertedAt >= monthStart && row.convertedAt <= monthEnd).length,
        scoped: monthlyEnquiryTrendScoped.filter((row) => row.convertedAt && row.convertedAt >= monthStart && row.convertedAt <= monthEnd).length
      }
    },
    feeCollections: {
      today: {
        rawCount: todayFeeTransactionsRaw.length,
        rawAmount: todayFeeTransactionsRaw.reduce((sum, row) => sum + toSafeNumber(row.amountPaid), 0),
        scopedCount: todayFeeTransactionsScoped.length,
        scopedAmount: todayFeeTransactionsScoped.reduce((sum, row) => sum + toSafeNumber(row.amountPaid), 0)
      },
      month: {
        rawCount: monthlyFeeTransactionsRaw.length,
        rawAmount: monthlyFeeTransactionsRaw.reduce((sum, row) => sum + toSafeNumber(row.amountPaid), 0),
        scopedCount: monthlyFeeTransactionsScoped.length,
        scopedAmount: monthlyFeeTransactionsScoped.reduce((sum, row) => sum + toSafeNumber(row.amountPaid), 0)
      }
    },
    cardMapping: {
      "Active Sessions": "selectedSession + dashboardSessions",
      "Total Students": "sessionStudentScope.students",
      "Pending Admissions": "getDashboardMetrics -> student.count(status in DRAFT/IN_PROGRESS/UNDER_REVIEW)",
      "Docs Pending": "getDashboardMetrics -> student.count(documentsStatus in PENDING/INCOMPLETE)",
      "Photo Upload Queue":
        "getDashboardMetrics -> active/promoted students, documents not verified, no STUDENT_PHOTO row",
      "10th Check Pending": "getDashboardMetrics -> student.count(eligibilityStatus=PENDING)",
      "Fee Due Cases": "getDashboardMetrics -> feeProfile.count(dueAmount > 0, student.session scoped)",
      "New Enquiries": "enquiries.today.scoped",
      "Follow-Ups Due": "enquiries.followUpsDue.scoped",
      "Scholarship Queries": "getDashboardMetrics -> scholarshipRecord.count(status=QUERY_BY_DEPARTMENT, student.session scoped)",
      "PRN Pending": "getDashboardMetrics -> student.count(prnScvtRecord missing OR prnNumber null, session scoped)",
      "SCVT Pending": "getDashboardMetrics -> student.count(prnScvtRecord missing OR scvtRegistrationNumber null, session scoped)",
      "Today's Available Cash": "feeCollections.today.scopedAmount + account cashflow adjustments (cash income - cash expense - bank deposit)",
      "This Month Collections": "feeCollections.month.scopedAmount",
      "This Month Expenses": "getDashboardInsights -> monthlyAccountEntries EXPENSE sum",
      "Net Cashflow": "getDashboardInsights -> monthlyIncome + monthlyCollections - monthlyExpenses - monthlyBankDeposits",
      "Enquiry Conversion": "enquiries.monthConverted.scoped / enquiries.month.scoped",
      "Certificates Issued": "getDashboardInsights -> certificatePrintLog.count(issueDate in month)",
      "Active Staff": "getDashboardInsights -> hrStaff.count(isActive=true, isGovtRecordOnly=false)",
      "Leave Approvals Pending": "getDashboardInsights -> hrLeaveRecord.count(status=PENDING)"
    }
  };
}
