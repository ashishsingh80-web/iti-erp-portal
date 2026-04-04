import { PaymentStatus, ScholarshipStatus, VerificationStatus } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { formatInr } from "@/lib/currency";

export type StageMetric = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
  href?: string;
};

export type StageRow = {
  id: string;
  primary: string;
  secondary: string;
  tertiary?: string;
  status: string;
  href?: string;
};

export type StageBoardData = {
  title: string;
  subtitle: string;
  metrics: StageMetric[];
  rows: StageRow[];
};

const STAGE_BOARD_CACHE_TTL_MS = 45_000;
const stageBoardsCache = new Map<
  string,
  {
    data: StageBoardData[];
    expiresAt: number;
  }
>();

function toStatusCountMap<T extends string>(
  rows: Array<{
    [key: string]: unknown;
    _count: { _all: number };
  }>,
  key: string
) {
  const map = new Map<T, number>();
  for (const row of rows) {
    const status = row[key];
    if (typeof status === "string") {
      map.set(status as T, row._count._all);
    }
  }
  return map;
}

async function loadDashboardStageBoards(): Promise<StageBoardData[]> {
  const cacheKey = "dashboard-stage-boards";
  const cached = stageBoardsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const [documents, fees, scholarship, examStatus, scvt, prn, undertaking] = await Promise.all([
    getDocumentsStageBoard(),
    getFeesStageBoard(),
    getScholarshipStageBoard(),
    getExamStatusStageBoard(),
    getScvtStageBoard(),
    getPrnStageBoard(),
    getUndertakingStageBoard()
  ]);

  const boards = [documents, fees, scholarship, examStatus, scvt, prn, undertaking];
  stageBoardsCache.set(cacheKey, {
    data: boards,
    expiresAt: Date.now() + STAGE_BOARD_CACHE_TTL_MS
  });
  return boards;
}

export async function getDashboardStageBoards() {
  const dayKey = new Date().toISOString().slice(0, 10);
  return unstable_cache(
    async () => loadDashboardStageBoards(),
    ["portal-stage-boards", dayKey],
    { revalidate: 90, tags: ["stage-boards"] }
  )();
}

export async function getDocumentsStageBoard(): Promise<StageBoardData> {
  const [statusCounts, rows] = await Promise.all([
    prisma.studentDocument.groupBy({
      by: ["verificationStatus"],
      where: { deletedAt: null },
      _count: { _all: true }
    }),
    prisma.studentDocument.findMany({
      where: { deletedAt: null },
      include: { student: true },
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);
  const statusMap = toStatusCountMap<VerificationStatus>(statusCounts, "verificationStatus");
  const pending = statusMap.get(VerificationStatus.PENDING) ?? 0;
  const incomplete = statusMap.get(VerificationStatus.INCOMPLETE) ?? 0;
  const rejected = statusMap.get(VerificationStatus.REJECTED) ?? 0;
  const verified = statusMap.get(VerificationStatus.VERIFIED) ?? 0;

  return {
    title: "Documents",
    subtitle: "Upload, verifier action, and completion queue",
    metrics: [
      { label: "Pending", value: String(pending), tone: "warning", href: "/modules/documents?status=PENDING" },
      { label: "Incomplete", value: String(incomplete), tone: "danger", href: "/modules/documents?status=INCOMPLETE" },
      { label: "Rejected", value: String(rejected), tone: "danger", href: "/modules/documents?status=REJECTED" },
      { label: "Verified", value: String(verified), tone: "success", href: "/modules/documents?status=VERIFIED" }
    ],
    rows: rows.map((item) => ({
      id: item.id,
      primary: `${item.student.studentCode} • ${item.student.fullName}`,
      secondary: `${item.documentType} • ${item.originalName}`,
      tertiary: item.ownerType,
      status: item.verificationStatus,
      href: `/students/${item.studentId}`
    }))
  };
}

export async function getFeesStageBoard(): Promise<StageBoardData> {
  const [statusCounts, dueCases, rows] = await Promise.all([
    prisma.feeProfile.groupBy({
      by: ["paymentStatus"],
      _count: { _all: true }
    }),
    prisma.feeProfile.count({ where: { dueAmount: { gt: 0 } } }),
    prisma.feeProfile.findMany({
      where: { dueAmount: { gt: 0 } },
      include: { student: true },
      orderBy: { dueAmount: "desc" },
      take: 8
    })
  ]);
  const statusMap = toStatusCountMap<PaymentStatus>(statusCounts, "paymentStatus");
  const unpaid = statusMap.get(PaymentStatus.UNPAID) ?? 0;
  const partial = statusMap.get(PaymentStatus.PARTIAL) ?? 0;
  const paid = statusMap.get(PaymentStatus.PAID) ?? 0;

  return {
    title: "Fees",
    subtitle: "Due amount stages and finance follow-up",
    metrics: [
      { label: "Unpaid", value: String(unpaid), tone: "danger", href: "/modules/fees?tab=collect" },
      { label: "Partial", value: String(partial), tone: "warning", href: "/modules/fees?tab=collect" },
      { label: "Paid", value: String(paid), tone: "success", href: "/modules/students?paymentStatus=PAID" },
      { label: "Due Cases", value: String(dueCases), tone: "warning", href: "/modules/fees?tab=collect" }
    ],
    rows: rows.map((item) => ({
      id: item.id,
      primary: `${item.student.studentCode} • ${item.student.fullName}`,
      secondary: `Final ${formatInr(item.finalFees.toString())} • Paid ${formatInr(item.paidAmount.toString())}`,
      tertiary: `Due ${formatInr(item.dueAmount.toString())}`,
      status: item.paymentStatus,
      href: `/students/${item.studentId}`
    }))
  };
}

export async function getScholarshipStageBoard(): Promise<StageBoardData> {
  const [statusCounts, rows] = await Promise.all([
    prisma.scholarshipRecord.groupBy({
      by: ["status"],
      _count: { _all: true }
    }),
    prisma.scholarshipRecord.findMany({
      where: {
        status: {
          in: [
            ScholarshipStatus.APPLIED,
            ScholarshipStatus.UNDER_PROCESS,
            ScholarshipStatus.QUERY_BY_DEPARTMENT,
            ScholarshipStatus.APPROVED,
            ScholarshipStatus.REJECTED
          ]
        }
      },
      include: { student: true },
      orderBy: { updatedAt: "desc" },
      take: 8
    })
  ]);
  const statusMap = toStatusCountMap<ScholarshipStatus>(statusCounts, "status");
  const applied = statusMap.get(ScholarshipStatus.APPLIED) ?? 0;
  const underProcess = statusMap.get(ScholarshipStatus.UNDER_PROCESS) ?? 0;
  const query = statusMap.get(ScholarshipStatus.QUERY_BY_DEPARTMENT) ?? 0;
  const approved = statusMap.get(ScholarshipStatus.APPROVED) ?? 0;

  return {
    title: "Scholarship",
    subtitle: "Application, query, approval, and credit stages",
    metrics: [
      { label: "Applied", value: String(applied), tone: "default", href: "/modules/scholarship?status=APPLIED" },
      { label: "Under Process", value: String(underProcess), tone: "warning", href: "/modules/scholarship?status=UNDER_PROCESS" },
      { label: "Query", value: String(query), tone: "danger", href: "/modules/scholarship?status=QUERY_BY_DEPARTMENT" },
      { label: "Approved", value: String(approved), tone: "success", href: "/modules/scholarship?status=APPROVED" }
    ],
    rows: rows.map((item) => ({
      id: item.id,
      primary: `${item.student.studentCode} • ${item.student.fullName}`,
      secondary: item.scholarshipId || "Scholarship ID pending",
      tertiary: item.queryText || "",
      status: item.status,
      href: `/students/${item.studentId}`
    }))
  };
}

export async function getExamStatusStageBoard(): Promise<StageBoardData> {
  const [practicalPending, practicalFailed, theoryFailed, maxExhausted, examFeePending, resultPublished, rows] = await Promise.all([
    prisma.examStatusRecord.count({ where: { practicalExamAppearance: "NOT_APPEARED" } }),
    prisma.examStatusRecord.count({ where: { tradePracticalResult: "FAIL", practicalEligibleReappear: true } }),
    prisma.examStatusRecord.count({ where: { onlineTheoryResult: "FAIL", theoryEligibleReappear: true } }),
    prisma.examStatusRecord.count({
      where: {
        OR: [
          { tradePracticalResult: "FAIL", practicalEligibleReappear: false },
          { onlineTheoryResult: "FAIL", theoryEligibleReappear: false }
        ]
      }
    }),
    prisma.examStatusRecord.count({ where: { examFeePaid: false } }),
    prisma.examStatusRecord.count({ where: { resultPublished: true } }),
    prisma.examStatusRecord.findMany({
      include: { student: true },
      orderBy: { updatedAt: "desc" },
      take: 8
    })
  ]);

  return {
    title: "Exam Status",
    subtitle: "Exam fee, hall ticket, practical permission, result status, and re-attempt eligibility tracking",
    metrics: [
      { label: "Exam Fee Pending", value: String(examFeePending), tone: "warning", href: "/modules/exam-status" },
      { label: "Not Appeared", value: String(practicalPending), tone: "warning", href: "/modules/exam-status" },
      { label: "Practical Fail", value: String(practicalFailed), tone: "danger", href: "/modules/exam-status" },
      { label: "Theory Fail", value: String(theoryFailed), tone: "danger", href: "/modules/exam-status" },
      { label: "Re-Appear Closed", value: String(maxExhausted), tone: "danger", href: "/modules/exam-status" },
      { label: "Results Published", value: String(resultPublished), tone: "success", href: "/modules/exam-status" }
    ],
    rows: rows.map((item) => ({
      id: item.id,
      primary: `${item.student.studentCode} • ${item.student.fullName}`,
      secondary: `Exam fee ${item.examFeePaid ? "paid" : "pending"} • Practical ${item.tradePracticalResult} • Theory ${item.onlineTheoryResult}`,
      tertiary: `Attempts P:${item.practicalAttemptCount} / T:${item.theoryAttemptCount}`,
      status:
        (item.tradePracticalResult === "FAIL" && !item.practicalEligibleReappear) ||
        (item.onlineTheoryResult === "FAIL" && !item.theoryEligibleReappear)
          ? "NOT_ELIGIBLE"
          : item.tradePracticalResult === "PASS" && item.onlineTheoryResult === "PASS"
            ? "PASSED"
            : "IN_PROGRESS",
      href: `/students/${item.studentId}`
    }))
  };
}

export async function getScvtStageBoard(): Promise<StageBoardData> {
  const [missingScvt, statusCounts, rows] = await Promise.all([
    prisma.prnScvtRecord.count({ where: { scvtRegistrationNumber: null } }),
    prisma.prnScvtRecord.groupBy({
      by: ["verificationStatus"],
      _count: { _all: true }
    }),
    prisma.prnScvtRecord.findMany({
      include: { student: true },
      orderBy: { updatedAt: "desc" },
      take: 8
    })
  ]);
  const statusMap = toStatusCountMap<VerificationStatus>(statusCounts, "verificationStatus");
  const incomplete = statusMap.get(VerificationStatus.INCOMPLETE) ?? 0;
  const verified = statusMap.get(VerificationStatus.VERIFIED) ?? 0;

  return {
    title: "SCVT",
    subtitle: "SCVT registration completion and verification queue",
    metrics: [
      { label: "SCVT Missing", value: String(missingScvt), tone: "warning", href: "/modules/scvt" },
      { label: "Incomplete", value: String(incomplete), tone: "danger", href: "/modules/students?scvtVerificationStatus=INCOMPLETE" },
      { label: "Verified", value: String(verified), tone: "success", href: "/modules/students?scvtVerificationStatus=VERIFIED" }
    ],
    rows: rows.map((item) => ({
      id: item.id,
      primary: `${item.student.studentCode} • ${item.student.fullName}`,
      secondary: `Ent. Roll ${item.entRollNumber || "Pending"} • SCVT ${item.scvtRegistrationNumber || "Pending"}`,
      tertiary: item.admissionStatus || item.remark || "",
      status: item.verificationStatus,
      href: `/students/${item.studentId}`
    }))
  };
}

export async function getPrnStageBoard(): Promise<StageBoardData> {
  const [lockedByScvt, missingPrn, verified, rows] = await Promise.all([
    prisma.prnScvtRecord.count({
      where: {
        OR: [{ scvtRegistrationNumber: null }, { verificationStatus: { not: VerificationStatus.VERIFIED } }]
      }
    }),
    prisma.prnScvtRecord.count({
      where: {
        scvtRegistrationNumber: { not: null },
        verificationStatus: VerificationStatus.VERIFIED,
        prnNumber: null
      }
    }),
    prisma.prnScvtRecord.count({ where: { prnNumber: { not: null } } }),
    prisma.prnScvtRecord.findMany({
      include: { student: true },
      orderBy: { updatedAt: "desc" },
      take: 8
    })
  ]);

  return {
    title: "PRN",
    subtitle: "PRN desk unlocks only after SCVT registration is completed",
    metrics: [
      { label: "Locked By SCVT", value: String(lockedByScvt), tone: "warning", href: "/modules/scvt" },
      { label: "PRN Missing", value: String(missingPrn), tone: "warning", href: "/modules/students?missingPrn=1" },
      { label: "PRN Filled", value: String(verified), tone: "success", href: "/modules/prn" }
    ],
    rows: rows.map((item) => ({
      id: item.id,
      primary: `${item.student.studentCode} • ${item.student.fullName}`,
      secondary: `SCVT ${item.scvtRegistrationNumber || "Pending"} • PRN ${item.prnNumber || "Pending"}`,
      tertiary: item.remark || "",
      status:
        item.scvtRegistrationNumber && item.verificationStatus === VerificationStatus.VERIFIED
          ? item.prnNumber
            ? "PRN_READY"
            : "PRN_OPEN"
          : "WAIT_SCVT",
      href: `/students/${item.studentId}`
    }))
  };
}

export async function getUndertakingStageBoard(): Promise<StageBoardData> {
  const [generationPending, generated, pendingApproval, signed, printHeavy, rows] = await Promise.all([
    prisma.undertakingRecord.count({ where: { generationStatus: VerificationStatus.PENDING } }),
    prisma.undertakingRecord.count({ where: { generationStatus: VerificationStatus.VERIFIED } }),
    prisma.undertakingRecord.count({ where: { signedDocumentUrl: { not: null }, signedStatus: VerificationStatus.PENDING } }),
    prisma.undertakingRecord.count({ where: { signedStatus: VerificationStatus.VERIFIED } }),
    prisma.undertakingRecord.count({ where: { printCount: { gte: 2 } } }),
    prisma.undertakingRecord.findMany({
      include: { student: true },
      orderBy: { updatedAt: "desc" },
      take: 8
    })
  ]);

  return {
    title: "Undertaking",
    subtitle: "Generate, download, signed-upload, and stage tracking",
    metrics: [
      { label: "Generation Pending", value: String(generationPending), tone: "warning", href: "/modules/students?undertakingGenerationStatus=PENDING" },
      { label: "Generated", value: String(generated), tone: "success", href: "/modules/undertaking" },
      { label: "Pending Approval", value: String(pendingApproval), tone: "warning", href: "/modules/undertaking" },
      { label: "Signed", value: String(signed), tone: "success", href: "/modules/students?undertakingSignedStatus=VERIFIED" },
      { label: "Printed 2+", value: String(printHeavy), tone: "default", href: "/modules/undertaking" }
    ],
    rows: rows.map((item) => ({
      id: item.id,
      primary: `${item.student.studentCode} • ${item.student.fullName}`,
      secondary: item.generatedUrl || "Generated file pending",
      tertiary: item.signedDocumentUrl || "Signed upload pending",
      status:
        item.signedDocumentUrl && item.signedStatus === VerificationStatus.PENDING
          ? `${item.generationStatus} / PENDING_ADMIN_APPROVAL`
          : `${item.generationStatus} / ${item.signedStatus}`,
      href: `/students/${item.studentId}`
    }))
  };
}
