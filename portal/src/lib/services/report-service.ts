import { EnquiryStatus, PaymentStatus, ScholarshipStatus, StudentStatus, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPeriodicFinanceSummary } from "@/lib/services/accounts-service";
import { getPurchaseRegister } from "@/lib/services/vendor-service";

export const reportKeys = [
  "admissions-summary",
  "document-pending",
  "fees-due",
  "fees-aging-agent-session",
  "fees-accounts-consistency",
  "finance-cashflow-mode",
  "finance-fee-collection-trend",
  "finance-agent-collection-vs-posting",
  "finance-summary",
  "purchase-register",
  "vendor-due",
  "agent-statement",
  "scholarship-status",
  "prn-scvt-pending",
  "enquiry-follow-up",
  "institute-comparison",
  "trade-demand",
  "session-finance"
] as const;

export type ReportKey = (typeof reportKeys)[number];

type ReportRow = Record<string, string>;

type ReportDefinition = {
  key: ReportKey;
  title: string;
  description: string;
  headers: string[];
  rows: ReportRow[];
};

export type ReportFilters = {
  search?: string;
  instituteCode?: string;
  session?: string;
  yearLabel?: string;
  tradeValue?: string;
  admissionMode?: string;
  paymentMode?: string;
  studentStatus?: string;
  documentStatus?: string;
  paymentStatus?: string;
  scholarshipStatus?: string;
  enquiryStatus?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function sortReportRows(
  rows: Array<Record<string, string>>,
  sortBy: string,
  sortDir: string
) {
  const direction = sortDir === "desc" ? -1 : 1;
  const nextRows = [...rows];

  nextRows.sort((left, right) => {
    const leftValue = left[sortBy] || "";
    const rightValue = right[sortBy] || "";
    const leftNumber = Number(leftValue.replace(/,/g, ""));
    const rightNumber = Number(rightValue.replace(/,/g, ""));
    const leftDate = Date.parse(leftValue);
    const rightDate = Date.parse(rightValue);

    if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber) && leftValue !== "" && rightValue !== "") {
      return (leftNumber - rightNumber) * direction;
    }

    if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
      return (leftDate - rightDate) * direction;
    }

    return leftValue.localeCompare(rightValue) * direction;
  });

  return nextRows;
}

export function paginateReportRows(
  rows: Array<Record<string, string>>,
  page: number,
  pageSize: number
) {
  const safePage = Math.max(page, 1);
  const safePageSize = Math.max(pageSize, 1);
  const start = (safePage - 1) * safePageSize;
  return rows.slice(start, start + safePageSize);
}

function buildModuleQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

function diffInDays(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return Math.max(Math.floor(ms / (1000 * 60 * 60 * 24)), 0);
}

function getAgingBucket(days: number) {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

function buildStudentWhere(filters: ReportFilters) {
  const search = filters.search?.trim();
  const tradeInstituteCode = filters.tradeValue?.includes("::") ? filters.tradeValue.split("::")[0] : "";
  const tradeCode = filters.tradeValue?.includes("::") ? filters.tradeValue.split("::")[1] : "";
  return {
    ...(filters.instituteCode ? { institute: { instituteCode: filters.instituteCode } } : {}),
    ...(filters.session ? { session: filters.session } : {}),
    ...(filters.yearLabel ? { yearLabel: filters.yearLabel } : {}),
    ...(filters.admissionMode ? { admissionMode: filters.admissionMode as "DIRECT" | "AGENT" } : {}),
    ...(filters.paymentMode ? { paymentMode: filters.paymentMode } : {}),
    ...(filters.tradeValue
      ? {
          trade: {
            ...(tradeCode ? { tradeCode } : {}),
            ...(tradeInstituteCode ? { institute: { instituteCode: tradeInstituteCode } } : {})
          }
        }
      : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { studentCode: { contains: search, mode: "insensitive" as const } },
            { mobile: { contains: search, mode: "insensitive" as const } }
          ]
        }
      : {})
  };
}

function buildDateRange(field: string, filters: ReportFilters) {
  if (!filters.dateFrom && !filters.dateTo) return {};
  return {
    [field]: {
      ...(filters.dateFrom ? { gte: new Date(`${filters.dateFrom}T00:00:00.000Z`) } : {}),
      ...(filters.dateTo ? { lte: new Date(`${filters.dateTo}T23:59:59.999Z`) } : {})
    }
  };
}

async function resolveEnquiryTradeIds(filters: ReportFilters): Promise<string[] | null> {
  if (!filters.tradeValue) return null;
  if (!filters.tradeValue.includes("::")) return [filters.tradeValue];
  const [instituteCode, tradeCode] = filters.tradeValue.split("::");
  if (!tradeCode) return [];
  const rows = await prisma.trade.findMany({
    where: {
      tradeCode,
      ...(instituteCode ? { institute: { instituteCode } } : {})
    },
    select: { id: true }
  });
  return rows.map((item) => item.id);
}

function buildEnquiryWhere(filters: ReportFilters, tradeIds: string[] | null, dueOnly: boolean) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const search = (filters.search || "").trim();
  const dueStatuses = filters.enquiryStatus
    ? [filters.enquiryStatus as EnquiryStatus]
    : [
        EnquiryStatus.NEW,
        EnquiryStatus.FOLLOW_UP,
        EnquiryStatus.VISIT_SCHEDULED,
        EnquiryStatus.COUNSELLED,
        EnquiryStatus.INTERESTED,
        EnquiryStatus.DOCUMENTS_PENDING
      ];
  return {
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { mobile: { contains: search } },
            { assignedCounsellor: { contains: search, mode: "insensitive" as const } }
          ]
        }
      : {}),
    ...(filters.instituteCode ? { instituteCode: filters.instituteCode } : {}),
    ...(tradeIds === null ? {} : tradeIds.length ? { tradeId: { in: tradeIds } } : { tradeId: "__no_trade_match__" }),
    ...(!dueOnly && filters.enquiryStatus ? { status: filters.enquiryStatus as EnquiryStatus } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? {
          enquiryDate: {
            ...(filters.dateFrom ? { gte: new Date(`${filters.dateFrom}T00:00:00.000Z`) } : {}),
            ...(filters.dateTo ? { lte: new Date(`${filters.dateTo}T23:59:59.999Z`) } : {})
          }
        }
      : {}),
    ...(dueOnly
      ? {
          nextFollowUpDate: {
            lte: today
          },
          status: {
            in: dueStatuses
          }
        }
      : {})
  };
}

export async function getReportSummaries(filters: ReportFilters = {}) {
  const studentWhere = buildStudentWhere(filters);
  const enquiryTradeIds = await resolveEnquiryTradeIds(filters);

  const [
    admissionPending,
    documentPending,
    feeDue,
    agingRows,
    consistencyProfiles,
    consistencyTx,
    consistencyEntries,
    financeSummary,
    purchaseRegister,
    agentCases,
    scholarshipQuery,
    prnPending,
    enquiryDue
  ] = await Promise.all([
    prisma.student.count({
      where: {
        ...studentWhere,
        status: {
          in: filters.studentStatus ? [filters.studentStatus as StudentStatus] : ["DRAFT", "IN_PROGRESS", "UNDER_REVIEW"]
        },
        ...buildDateRange("createdAt", filters)
      }
    }),
    prisma.student.count({
      where: {
        ...studentWhere,
        documentsStatus: {
          in: filters.documentStatus ? [filters.documentStatus as VerificationStatus] : [VerificationStatus.PENDING, VerificationStatus.INCOMPLETE, VerificationStatus.REJECTED]
        },
        ...buildDateRange("updatedAt", filters)
      }
    }),
    prisma.feeProfile.count({
      where: {
        student: studentWhere,
        ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus as PaymentStatus } : {}),
        dueAmount: {
          gt: 0
        }
      }
    }),
    prisma.feeProfile.findMany({
      where: {
        student: studentWhere,
        dueAmount: {
          gt: 0
        }
      },
      include: {
        student: {
          select: {
            admissionDate: true,
            createdAt: true
          }
        }
      }
    }),
    prisma.feeProfile.findMany({
      where: { student: studentWhere },
      select: {
        studentId: true,
        paidAmount: true
      }
    }),
    prisma.feeTransaction.findMany({
      where: { student: studentWhere },
      select: {
        id: true,
        studentId: true,
        amountPaid: true
      }
    }),
    prisma.accountEntry.findMany({
      where: {
        student: studentWhere,
        feeTransactionId: { not: null }
      },
      select: {
        id: true,
        feeTransactionId: true
      }
    }),
    getPeriodicFinanceSummary({
      period: filters.dateFrom || filters.dateTo ? "CUSTOM" : "MONTHLY",
      month: new Date().toISOString().slice(0, 7),
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo
    }),
    getPurchaseRegister({
      vendorName: filters.search,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo
    }),
    prisma.student.count({
      where: {
        ...studentWhere,
        admissionMode: "AGENT"
      }
    }),
    prisma.scholarshipRecord.count({
      where: {
        student: studentWhere,
        status: {
          in: filters.scholarshipStatus ? [filters.scholarshipStatus as ScholarshipStatus] : [ScholarshipStatus.QUERY_BY_DEPARTMENT, ScholarshipStatus.UNDER_PROCESS]
        },
        ...buildDateRange("updatedAt", filters)
      }
    }),
    prisma.prnScvtRecord.count({
      where: {
        student: studentWhere,
        OR: [{ prnNumber: null }, { scvtRegistrationNumber: null }]
      }
    }),
    prisma.enquiry.count({
      where: buildEnquiryWhere(filters, enquiryTradeIds, true)
    })
  ]);

  const now = new Date();
  let agedOver90Due = 0;
  for (const row of agingRows) {
    const baseDate = row.student.admissionDate || row.student.createdAt;
    if (getAgingBucket(diffInDays(baseDate, now)) === "90+") {
      agedOver90Due += 1;
    }
  }

  const txSumByStudent = new Map<string, number>();
  for (const tx of consistencyTx) {
    txSumByStudent.set(tx.studentId, (txSumByStudent.get(tx.studentId) || 0) + Number(tx.amountPaid || 0));
  }
  const entryCountByTx = new Map<string, number>();
  for (const row of consistencyEntries) {
    const txId = row.feeTransactionId || "";
    if (txId) {
      entryCountByTx.set(txId, (entryCountByTx.get(txId) || 0) + 1);
    }
  }
  let consistencyIssues = 0;
  for (const profile of consistencyProfiles) {
    const paid = Number(profile.paidAmount || 0);
    const txTotal = txSumByStudent.get(profile.studentId) || 0;
    if (Math.abs(paid - txTotal) > 0.01) consistencyIssues += 1;
  }
  for (const tx of consistencyTx) {
    const count = entryCountByTx.get(tx.id) || 0;
    if (count !== 1) consistencyIssues += 1;
  }

  return [
    {
      key: "admissions-summary" as const,
      title: "Admissions Queue",
      value: String(admissionPending),
      helper: "Students not yet completed"
    },
    {
      key: "document-pending" as const,
      title: "Document Queue",
      value: String(documentPending),
      helper: "Missing, incomplete, or rejected docs"
    },
    {
      key: "fees-due" as const,
      title: "Fees Due",
      value: String(feeDue),
      helper: "Students with outstanding balance"
    },
    {
      key: "fees-aging-agent-session" as const,
      title: "Fee Aging (90+)",
      value: String(agedOver90Due),
      helper: "Overdue fee cases aged beyond 90 days"
    },
    {
      key: "fees-accounts-consistency" as const,
      title: "Fee-Accounts Mismatch",
      value: String(consistencyIssues),
      helper: "Profiles or transactions needing ledger reconciliation"
    },
    {
      key: "finance-summary" as const,
      title: "Finance Summary",
      value: financeSummary.summary.netBalance,
      helper: `Net balance for ${financeSummary.label}`
    },
    {
      key: "purchase-register" as const,
      title: "Purchase Register",
      value: purchaseRegister.summary.totalBilled,
      helper: "Total vendor billing recorded"
    },
    {
      key: "vendor-due" as const,
      title: "Vendor Due",
      value: purchaseRegister.summary.totalDue,
      helper: "Outstanding payable to vendors"
    },
    {
      key: "agent-statement" as const,
      title: "Agent Statement",
      value: String(agentCases),
      helper: "Agent-managed student accounts"
    },
    {
      key: "scholarship-status" as const,
      title: "Scholarship Follow-up",
      value: String(scholarshipQuery),
      helper: "Active scholarship desk cases"
    },
    {
      key: "prn-scvt-pending" as const,
      title: "PRN / SCVT Queue",
      value: String(prnPending),
      helper: "Registration numbers still pending"
    },
    {
      key: "enquiry-follow-up" as const,
      title: "Enquiry Follow-up Due",
      value: String(enquiryDue),
      helper: "Callbacks due today or earlier"
    },
    {
      key: "institute-comparison" as const,
      title: "Institute Comparison",
      value: filters.instituteCode || "All",
      helper: "Institute-wise working load and risk view"
    },
    {
      key: "trade-demand" as const,
      title: "Trade Demand",
      value: filters.tradeValue || "All",
      helper: "Admissions and enquiries by trade"
    },
    {
      key: "session-finance" as const,
      title: "Session Finance",
      value: filters.session || "All",
      helper: "Collections and due amount by session"
    }
  ];
}

export async function getReportData(report: ReportKey, filters: ReportFilters = {}): Promise<ReportDefinition> {
  const studentWhere = buildStudentWhere(filters);
  switch (report) {
    case "admissions-summary": {
      const students = await prisma.student.findMany({
        where: {
          ...studentWhere,
          status: {
            in: filters.studentStatus ? [filters.studentStatus as StudentStatus] : ["DRAFT", "IN_PROGRESS", "UNDER_REVIEW"]
          },
          ...buildDateRange("createdAt", filters)
        },
        include: {
          institute: true,
          trade: true
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 50
      });

      return {
        key: report,
        title: "Admissions Summary",
        description: "Students still moving through admission, verification, or completion workflow.",
        headers: ["Student Code", "Student Name", "Institute", "Trade", "Status", "Eligibility", "Documents"],
        rows: students.map((item) => ({
          "Student Code": item.studentCode,
          "Student Name": item.fullName,
          Institute: item.institute.name,
          Trade: item.trade.name,
          Status: item.status,
          Eligibility: item.eligibilityStatus,
          Documents: item.documentsStatus,
          _studentId: item.id,
          _detailHref: `/students/${item.id}`,
          _detailLabel: "Open Student"
        }))
      };
    }
    case "document-pending": {
      const students = await prisma.student.findMany({
        where: {
          ...studentWhere,
          documentsStatus: {
            in: filters.documentStatus ? [filters.documentStatus as VerificationStatus] : [VerificationStatus.PENDING, VerificationStatus.INCOMPLETE, VerificationStatus.REJECTED]
          },
          ...buildDateRange("updatedAt", filters)
        },
        include: {
          institute: true,
          trade: true
        },
        orderBy: {
          updatedAt: "desc"
        },
        take: 50
      });

      return {
        key: report,
        title: "Pending Document Queue",
        description: "Students whose required document workflow still needs verifier attention.",
        headers: ["Student Code", "Student Name", "Institute", "Trade", "Document Status", "Student Status"],
        rows: students.map((item) => ({
          "Student Code": item.studentCode,
          "Student Name": item.fullName,
          Institute: item.institute.name,
          Trade: item.trade.name,
          "Document Status": item.documentsStatus,
          "Student Status": item.status,
          _studentId: item.id,
          _detailHref: `/students/${item.id}`,
          _detailLabel: "Open Student"
        }))
      };
    }
    case "fees-due": {
      const rows = await prisma.feeProfile.findMany({
        where: {
          student: studentWhere,
          ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus as PaymentStatus } : {}),
          dueAmount: {
            gt: 0
          }
        },
        include: {
          student: {
            include: {
              institute: true,
              trade: true
            }
          }
        },
        orderBy: {
          dueAmount: "desc"
        },
        take: 50
      });

      return {
        key: report,
        title: "Fees Due Report",
        description: "Students with unpaid balance, ordered by highest due amount first.",
        headers: ["Student Code", "Student Name", "Institute", "Trade", "Final Fees", "Paid", "Due", "Payment Status"],
        rows: rows.map((item) => ({
          "Student Code": item.student.studentCode,
          "Student Name": item.student.fullName,
          Institute: item.student.institute.name,
          Trade: item.student.trade.name,
          "Final Fees": item.finalFees.toString(),
          Paid: item.paidAmount.toString(),
          Due: item.dueAmount.toString(),
          "Payment Status": item.paymentStatus,
          _studentId: item.student.id,
          _detailHref: `/students/${item.student.id}`,
          _detailLabel: "Open Student"
        }))
      };
    }
    case "fees-aging-agent-session": {
      const rows = await prisma.student.findMany({
        where: {
          ...studentWhere,
          feeProfile: {
            dueAmount: {
              gt: 0
            }
          }
        },
        include: {
          agent: true,
          feeProfile: true
        }
      });

      const now = new Date();
      const grouped = new Map<
        string,
        {
          session: string;
          channel: string;
          agent: string;
          dueStudents: number;
          totalDue: number;
          bucket0to30: number;
          bucket31to60: number;
          bucket61to90: number;
          bucket90plus: number;
        }
      >();

      for (const row of rows) {
        const dueAmount = Number(row.feeProfile?.dueAmount || 0);
        if (dueAmount <= 0) continue;

        const channel = row.admissionMode === "AGENT" ? "AGENT" : "DIRECT";
        const agentCode = row.admissionMode === "AGENT" ? row.agent?.agentCode || "UNMAPPED_AGENT" : "DIRECT";
        const key = `${row.session}|${agentCode}`;
        const current = grouped.get(key) || {
          session: row.session,
          channel,
          agent: agentCode,
          dueStudents: 0,
          totalDue: 0,
          bucket0to30: 0,
          bucket31to60: 0,
          bucket61to90: 0,
          bucket90plus: 0
        };
        current.dueStudents += 1;
        current.totalDue += dueAmount;

        const baseDate = row.admissionDate || row.createdAt;
        const bucket = getAgingBucket(diffInDays(baseDate, now));
        if (bucket === "0-30") current.bucket0to30 += 1;
        else if (bucket === "31-60") current.bucket31to60 += 1;
        else if (bucket === "61-90") current.bucket61to90 += 1;
        else current.bucket90plus += 1;
        grouped.set(key, current);
      }

      return {
        key: report,
        title: "Fees Aging by Agent/Session",
        description: "Due-fee exposure by session and admission channel with aging buckets for collection prioritization.",
        headers: ["Session", "Channel", "Agent", "Due Students", "Total Due", "0-30 Days", "31-60 Days", "61-90 Days", "90+ Days"],
        rows: Array.from(grouped.values())
          .sort((a, b) => b.totalDue - a.totalDue)
          .map((item) => ({
            Session: item.session,
            Channel: item.channel,
            Agent: item.agent,
            "Due Students": String(item.dueStudents),
            "Total Due": item.totalDue.toFixed(2),
            "0-30 Days": String(item.bucket0to30),
            "31-60 Days": String(item.bucket31to60),
            "61-90 Days": String(item.bucket61to90),
            "90+ Days": String(item.bucket90plus),
            _detailHref: `/modules/fees${buildModuleQuery({
              session: item.session,
              agentCode: item.channel === "AGENT" && item.agent !== "UNMAPPED_AGENT" ? item.agent : undefined,
              instituteCode: filters.instituteCode,
              yearLabel: filters.yearLabel
            })}`,
            _detailLabel: "Open Fees"
          }))
      };
    }
    case "fees-accounts-consistency": {
      const [profiles, transactions] = await Promise.all([
        prisma.feeProfile.findMany({
          where: { student: studentWhere },
          include: {
            student: {
              select: {
                id: true,
                studentCode: true,
                fullName: true,
                session: true
              }
            }
          }
        }),
        prisma.feeTransaction.findMany({
          where: {
            student: studentWhere
          },
          select: {
            id: true,
            studentId: true,
            amountPaid: true
          }
        })
      ]);

      const txIds = transactions.map((tx) => tx.id);
      const entries = txIds.length
        ? await prisma.accountEntry.findMany({
            where: {
              feeTransactionId: {
                in: txIds
              }
            },
            select: {
              id: true,
              feeTransactionId: true,
              studentId: true,
              amount: true,
              entryType: true,
              category: true,
              head: true
            }
          })
        : [];

      const txSumByStudent = new Map<string, number>();
      const txById = new Map(transactions.map((tx) => [tx.id, tx]));
      for (const tx of transactions) {
        txSumByStudent.set(tx.studentId, (txSumByStudent.get(tx.studentId) || 0) + Number(tx.amountPaid || 0));
      }

      const entriesByTxId = new Map<string, typeof entries>();
      for (const entry of entries) {
        const txId = entry.feeTransactionId || "";
        if (!txId) continue;
        const list = entriesByTxId.get(txId) || [];
        list.push(entry);
        entriesByTxId.set(txId, list);
      }

      const profileByStudent = new Map(
        profiles.map((profile) => [
          profile.studentId,
          {
            id: profile.student.id,
            studentCode: profile.student.studentCode,
            fullName: profile.student.fullName,
            session: profile.student.session,
            paidAmount: Number(profile.paidAmount || 0)
          }
        ])
      );

      const issues: Array<Record<string, string>> = [];
      for (const profile of profiles) {
        const paidAmount = Number(profile.paidAmount || 0);
        const txTotal = txSumByStudent.get(profile.studentId) || 0;
        if (Math.abs(paidAmount - txTotal) > 0.01) {
          issues.push({
            Issue: "PROFILE_TX_SUM_MISMATCH",
            "Student Code": profile.student.studentCode,
            "Student Name": profile.student.fullName,
            Session: profile.student.session,
            "Profile Paid": paidAmount.toFixed(2),
            "Tx Sum": txTotal.toFixed(2),
            "Ledger Entry": "-",
            _studentId: profile.student.id,
            _detailHref: `/students/${profile.student.id}`,
            _detailLabel: "Open Student"
          });
        }
      }

      for (const tx of transactions) {
        const related = entriesByTxId.get(tx.id) || [];
        const student = profileByStudent.get(tx.studentId);
        if (!student) continue;

        if (related.length !== 1) {
          issues.push({
            Issue: related.length === 0 ? "MISSING_LEDGER_ENTRY" : "DUPLICATE_LEDGER_ENTRIES",
            "Student Code": student.studentCode,
            "Student Name": student.fullName,
            Session: student.session,
            "Profile Paid": student.paidAmount.toFixed(2),
            "Tx Sum": Number(tx.amountPaid || 0).toFixed(2),
            "Ledger Entry": related.length ? String(related.length) : "0",
            _studentId: student.id,
            _detailHref: `/students/${student.id}`,
            _detailLabel: "Open Student"
          });
          continue;
        }

        const entry = related[0];
        const txAmount = Number(tx.amountPaid || 0);
        const entryAmount = Number(entry.amount || 0);
        const shapeInvalid =
          entry.entryType !== "INCOME" ||
          entry.category !== "FEE_COLLECTION" ||
          entry.head !== "FEE_COLLECTION" ||
          Math.abs(entryAmount - txAmount) > 0.01 ||
          (entry.studentId && entry.studentId !== tx.studentId);
        if (shapeInvalid) {
          issues.push({
            Issue: "LEDGER_SHAPE_MISMATCH",
            "Student Code": student.studentCode,
            "Student Name": student.fullName,
            Session: student.session,
            "Profile Paid": student.paidAmount.toFixed(2),
            "Tx Sum": txAmount.toFixed(2),
            "Ledger Entry": entry.id,
            _studentId: student.id,
            _detailHref: `/students/${student.id}`,
            _detailLabel: "Open Student"
          });
        }
      }

      return {
        key: report,
        title: "Fees vs Accounts Consistency",
        description: "Detects payment/ledger mismatches: fee profile totals, missing ledger posts, duplicate links, and malformed fee income entries.",
        headers: ["Issue", "Student Code", "Student Name", "Session", "Profile Paid", "Tx Sum", "Ledger Entry"],
        rows: issues
      };
    }
    case "finance-cashflow-mode": {
      const [feeRows, accountRows] = await Promise.all([
        prisma.feeTransaction.findMany({
          where: {
            student: studentWhere,
            ...buildDateRange("transactionDate", filters)
          },
          select: {
            paymentMode: true,
            amountPaid: true
          }
        }),
        prisma.accountEntry.findMany({
          where: {
            ...buildDateRange("entryDate", filters),
            feeTransactionId: null
          },
          select: {
            paymentMode: true,
            amount: true,
            entryType: true
          }
        })
      ]);

      const modeMap = new Map<
        string,
        {
          mode: string;
          feeCollection: number;
          otherIncome: number;
          expense: number;
          bankDeposit: number;
          net: number;
        }
      >();

      function ensureMode(mode: string) {
        const key = mode || "UNKNOWN";
        const current = modeMap.get(key) || {
          mode: key,
          feeCollection: 0,
          otherIncome: 0,
          expense: 0,
          bankDeposit: 0,
          net: 0
        };
        modeMap.set(key, current);
        return current;
      }

      for (const row of feeRows) {
        const current = ensureMode(row.paymentMode);
        const amount = Number(row.amountPaid || 0);
        current.feeCollection += amount;
        current.net += amount;
      }

      for (const row of accountRows) {
        const current = ensureMode(row.paymentMode);
        const amount = Number(row.amount || 0);
        if (row.entryType === "INCOME") {
          current.otherIncome += amount;
          current.net += amount;
        } else if (row.entryType === "EXPENSE") {
          current.expense += amount;
          current.net -= amount;
        } else if (row.entryType === "BANK_DEPOSIT") {
          current.bankDeposit += amount;
          current.net -= amount;
        }
      }

      return {
        key: report,
        title: "Finance Cashflow by Payment Mode",
        description: "Combines fee collections and accounts ledger movement by payment mode for operational cashflow tracking.",
        headers: ["Payment Mode", "Fee Collection", "Other Income", "Expense", "Bank Deposit", "Net Movement"],
        rows: Array.from(modeMap.values())
          .sort((a, b) => b.net - a.net)
          .map((item) => ({
            "Payment Mode": item.mode,
            "Fee Collection": item.feeCollection.toFixed(2),
            "Other Income": item.otherIncome.toFixed(2),
            Expense: item.expense.toFixed(2),
            "Bank Deposit": item.bankDeposit.toFixed(2),
            "Net Movement": item.net.toFixed(2),
            _detailHref: `/modules/accounts${buildModuleQuery({
              filterDateFrom: filters.dateFrom,
              filterDateTo: filters.dateTo,
              filterMonth: filters.dateFrom || filters.dateTo ? undefined : new Date().toISOString().slice(0, 7)
            })}`,
            _detailLabel: "Open Accounts"
          }))
      };
    }
    case "finance-fee-collection-trend": {
      const txRows = await prisma.feeTransaction.findMany({
        where: {
          student: studentWhere,
          ...buildDateRange("transactionDate", filters)
        },
        select: {
          transactionDate: true,
          amountPaid: true
        },
        orderBy: {
          transactionDate: "asc"
        }
      });

      const dayMap = new Map<string, { day: string; receipts: number; collections: number }>();
      for (const row of txRows) {
        const day = row.transactionDate.toISOString().slice(0, 10);
        const current = dayMap.get(day) || { day, receipts: 0, collections: 0 };
        current.receipts += 1;
        current.collections += Number(row.amountPaid || 0);
        dayMap.set(day, current);
      }

      return {
        key: report,
        title: "Fee Collection Trend",
        description: "Day-wise receipt count and collection amount trend to monitor collection velocity.",
        headers: ["Date", "Receipts", "Collections"],
        rows: Array.from(dayMap.values()).map((item) => ({
          Date: item.day,
          Receipts: String(item.receipts),
          Collections: item.collections.toFixed(2)
        }))
      };
    }
    case "finance-agent-collection-vs-posting": {
      const [collections, postedRows] = await Promise.all([
        prisma.agentCollection.findMany({
          where: {
            ...buildDateRange("collectionDate", filters),
            ...(filters.search
              ? {
                  agent: {
                    OR: [
                      { name: { contains: filters.search, mode: "insensitive" } },
                      { agentCode: { contains: filters.search, mode: "insensitive" } }
                    ]
                  }
                }
              : {})
          },
          include: {
            agent: true
          },
          orderBy: {
            collectionDate: "desc"
          }
        }),
        prisma.feeTransaction.findMany({
          where: {
            payerType: "AGENT",
            allocationGroup: { not: null },
            student: studentWhere,
            ...buildDateRange("transactionDate", filters)
          },
          select: {
            allocationGroup: true,
            amountPaid: true
          }
        })
      ]);

      const postedByCollection = new Map<string, number>();
      for (const row of postedRows) {
        const key = row.allocationGroup || "";
        if (!key) continue;
        postedByCollection.set(key, (postedByCollection.get(key) || 0) + Number(row.amountPaid || 0));
      }

      return {
        key: report,
        title: "Agent Collection vs Fee Posting",
        description: "Compares agent collection vouchers with posted fee transactions to identify posting gaps.",
        headers: ["Date", "Collection ID", "Agent", "Total Collected", "Allocated", "Posted To Fees", "Unallocated", "Posting Gap"],
        rows: collections.map((item) => {
          const posted = postedByCollection.get(item.id) || 0;
          const allocated = Number(item.allocatedAmount || 0);
          return {
            Date: item.collectionDate.toISOString().slice(0, 10),
            "Collection ID": item.id,
            Agent: `${item.agent.agentCode} • ${item.agent.name}`,
            "Total Collected": Number(item.totalAmount || 0).toFixed(2),
            Allocated: allocated.toFixed(2),
            "Posted To Fees": posted.toFixed(2),
            Unallocated: Number(item.unallocatedAmount || 0).toFixed(2),
            "Posting Gap": (allocated - posted).toFixed(2),
            _detailHref: `/modules/fees${buildModuleQuery({
              agentCode: item.agent.agentCode,
              session: filters.session,
              yearLabel: filters.yearLabel
            })}`,
            _detailLabel: "Open Fees"
          };
        })
      };
    }
    case "finance-summary": {
      const report = await getPeriodicFinanceSummary({
        period: filters.dateFrom || filters.dateTo ? "CUSTOM" : "MONTHLY",
        month: new Date().toISOString().slice(0, 7),
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo
      });

      return {
        key: "finance-summary",
        title: "Monthly Finance Summary",
        description: "Head-wise finance totals for the current month, including income, expenses, and net balance.",
        headers: ["Range", "Head", "Entries", "Total"],
        rows: report.headSummary.map((item) => ({
          Range: report.label,
          Head: item.head,
          Entries: item.entries,
          Total: item.total,
          _detailHref: `/modules/accounts${buildModuleQuery({
            reportPeriod: filters.dateFrom || filters.dateTo ? "CUSTOM" : "MONTHLY",
            reportMonth: new Date().toISOString().slice(0, 7),
            reportFromDate: filters.dateFrom,
            reportToDate: filters.dateTo,
            filterDateFrom: filters.dateFrom,
            filterDateTo: filters.dateTo
          })}`,
          _detailLabel: "Open Accounts"
        }))
      };
    }
    case "purchase-register": {
      const report = await getPurchaseRegister({
        vendorName: filters.search,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo
      });

      return {
        key: "purchase-register",
        title: "Purchase Register",
        description: "All vendor purchase bills with billed, paid, and due amounts.",
        headers: ["Vendor", "Bill Date", "Material", "Reference", "Total", "Paid", "Due", "Status"],
        rows: report.rows.map((item) => ({
          Vendor: item.vendorName,
          "Bill Date": item.billDate.slice(0, 10),
          Material: item.materialDescription,
          Reference: item.referenceNo,
          Total: item.totalAmount,
          Paid: item.paidAmount,
          Due: item.dueAmount,
          Status: item.paymentStatus,
          _detailHref: `/modules/accounts${buildModuleQuery({
            vendorSearch: item.vendorName,
            filterDateFrom: filters.dateFrom,
            filterDateTo: filters.dateTo
          })}`,
          _detailLabel: "Open Vendor"
        }))
      };
    }
    case "vendor-due": {
      const report = await getPurchaseRegister({
        vendorName: filters.search,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo
      });
      const dueRows = report.rows.filter((item) => Number(item.dueAmount) > 0);

      return {
        key: "vendor-due",
        title: "Vendor Due Report",
        description: "Vendors with outstanding payable amount still pending with the institute.",
        headers: ["Vendor", "Bill Date", "Material", "Reference", "Total", "Paid", "Due", "Status"],
        rows: dueRows.map((item) => ({
          Vendor: item.vendorName,
          "Bill Date": item.billDate.slice(0, 10),
          Material: item.materialDescription,
          Reference: item.referenceNo,
          Total: item.totalAmount,
          Paid: item.paidAmount,
          Due: item.dueAmount,
          Status: item.paymentStatus,
          _detailHref: `/modules/accounts${buildModuleQuery({
            vendorSearch: item.vendorName,
            filterDateFrom: filters.dateFrom,
            filterDateTo: filters.dateTo
          })}`,
          _detailLabel: "Open Vendor"
        }))
      };
    }
    case "scholarship-status": {
      const rows = await prisma.scholarshipRecord.findMany({
        include: {
          student: {
            include: {
              institute: true,
              trade: true
            }
          }
        },
        where: {
          student: studentWhere,
          status: {
            in: filters.scholarshipStatus
              ? [filters.scholarshipStatus as ScholarshipStatus]
              : [
                  ScholarshipStatus.APPLIED,
                  ScholarshipStatus.UNDER_PROCESS,
                  ScholarshipStatus.QUERY_BY_DEPARTMENT,
                  ScholarshipStatus.APPROVED,
                  ScholarshipStatus.REJECTED
                ]
          },
          ...buildDateRange("updatedAt", filters)
        },
        orderBy: {
          updatedAt: "desc"
        },
        take: 50
      });

      return {
        key: report,
        title: "Scholarship Status Report",
        description: "Scholarship cases across applied, query, approved, and rejected states.",
        headers: ["Student Code", "Student Name", "Institute", "Status", "Scholarship ID", "Query", "Approved Date", "Credited Amount"],
        rows: rows.map((item) => ({
          "Student Code": item.student.studentCode,
          "Student Name": item.student.fullName,
          Institute: item.student.institute.name,
          Status: item.status,
          "Scholarship ID": item.scholarshipId || "",
          Query: item.queryText || "",
          "Approved Date": formatDate(item.approvedDate),
          "Credited Amount": item.creditedAmount?.toString() || "",
          _studentId: item.student.id,
          _detailHref: `/students/${item.student.id}`,
          _detailLabel: "Open Student"
        }))
      };
    }
    case "agent-statement": {
      const rows = await prisma.agent.findMany({
        include: {
          students: {
            where: {
              deletedAt: null,
              ...studentWhere
            },
            include: {
              feeProfile: true
            }
          },
          collections: true
        },
        orderBy: {
          name: "asc"
        }
      });

      return {
        key: report,
        title: "Agent Statement",
        description: "Agent-wise committed fee, paid amount, due amount, and unallocated collection balance.",
        headers: ["Agent Code", "Agent Name", "Students", "Committed", "Paid", "Due", "Collections", "Unallocated"],
        rows: rows.map((agent) => ({
          "Agent Code": agent.agentCode,
          "Agent Name": agent.name,
          Students: String(agent.students.length),
          Committed: agent.students.reduce((sum, student) => sum + Number(student.feeProfile?.finalFees || 0), 0).toFixed(2),
          Paid: agent.students.reduce((sum, student) => sum + Number(student.feeProfile?.paidAmount || 0), 0).toFixed(2),
          Due: agent.students.reduce((sum, student) => sum + Number(student.feeProfile?.dueAmount || 0), 0).toFixed(2),
          Collections: agent.collections.reduce((sum, row) => sum + Number(row.totalAmount), 0).toFixed(2),
          Unallocated: agent.collections.reduce((sum, row) => sum + Number(row.unallocatedAmount), 0).toFixed(2),
          _detailHref: `/modules/fees${buildModuleQuery({
            agentCode: agent.agentCode,
            session: filters.session,
            yearLabel: filters.yearLabel,
            search: filters.search
          })}`,
          _detailLabel: "Open Fees"
        }))
      };
    }
    case "prn-scvt-pending": {
      const rows = await prisma.prnScvtRecord.findMany({
        where: {
          student: studentWhere,
          OR: [{ prnNumber: null }, { scvtRegistrationNumber: null }]
        },
        include: {
          student: {
            include: {
              institute: true,
              trade: true
            }
          }
        },
        orderBy: {
          updatedAt: "desc"
        },
        take: 50
      });

      return {
        key: report,
        title: "PRN / SCVT Pending Report",
        description: "Students still waiting for PRN or SCVT registration details.",
        headers: ["Student Code", "Student Name", "Institute", "Trade", "PRN Number", "SCVT Number", "Verification", "Upload Date"],
        rows: rows.map((item) => ({
          "Student Code": item.student.studentCode,
          "Student Name": item.student.fullName,
          Institute: item.student.institute.name,
          Trade: item.student.trade.name,
          "PRN Number": item.prnNumber || "",
          "SCVT Number": item.scvtRegistrationNumber || "",
          Verification: item.verificationStatus,
          "Upload Date": formatDate(item.uploadDate),
          _studentId: item.student.id,
          _detailHref: `/students/${item.student.id}`,
          _detailLabel: "Open Student"
        }))
      };
    }
    case "enquiry-follow-up": {
      const enquiryTradeIds = await resolveEnquiryTradeIds(filters);
      const rows = await prisma.enquiry.findMany({
        where: buildEnquiryWhere(filters, enquiryTradeIds, true),
        orderBy: [{ status: "asc" }, { nextFollowUpDate: "asc" }, { enquiryDate: "desc" }],
        take: 100
      });

      return {
        key: report,
        title: "Enquiry Follow-up Report",
        description: "Enquiry callbacks that are due today or earlier, prioritized by status and follow-up date.",
        headers: ["Student Name", "Mobile", "Institute", "Trade", "Status", "Source", "Enquiry Date", "Next Follow-Up", "Counsellor", "Converted Student"],
        rows: rows.map((item) => ({
          "Student Name": item.fullName,
          Mobile: item.mobile,
          Institute: item.instituteCode || "",
          Trade: item.tradeId || "",
          Status: item.status,
          Source: item.source,
          "Enquiry Date": formatDate(item.enquiryDate),
          "Next Follow-Up": formatDate(item.nextFollowUpDate),
          Counsellor: item.assignedCounsellor || "",
          "Converted Student": item.convertedStudentCode || "",
          _detailHref: `/modules/enquiry`,
          _detailLabel: "Open Enquiry Desk"
        }))
      };
    }
    case "institute-comparison": {
      const students = await prisma.student.findMany({
        where: studentWhere,
        include: {
          institute: true,
          feeProfile: true
        }
      });

      const instituteMap = new Map<
        string,
        {
          institute: string;
          code: string;
          totalStudents: number;
          docsPending: number;
          feeDueCases: number;
          totalDue: number;
        }
      >();

      for (const student of students) {
        const key = student.institute.instituteCode || student.institute.name;
        const current = instituteMap.get(key) || {
          institute: student.institute.name,
          code: student.institute.instituteCode,
          totalStudents: 0,
          docsPending: 0,
          feeDueCases: 0,
          totalDue: 0
        };
        current.totalStudents += 1;
        if (
          student.documentsStatus === VerificationStatus.PENDING ||
          student.documentsStatus === VerificationStatus.INCOMPLETE ||
          student.documentsStatus === VerificationStatus.REJECTED
        ) {
          current.docsPending += 1;
        }
        const dueAmount = Number(student.feeProfile?.dueAmount || 0);
        if (dueAmount > 0) {
          current.feeDueCases += 1;
          current.totalDue += dueAmount;
        }
        instituteMap.set(key, current);
      }

      return {
        key: report,
        title: "Institute Comparison Report",
        description: "Institute-wise student load, document risk, fee due cases, and outstanding amount.",
        headers: ["Institute Code", "Institute Name", "Total Students", "Docs Pending", "Fee Due Cases", "Outstanding Due"],
        rows: Array.from(instituteMap.values())
          .sort((a, b) => b.totalStudents - a.totalStudents)
          .map((item) => ({
            "Institute Code": item.code,
            "Institute Name": item.institute,
            "Total Students": String(item.totalStudents),
            "Docs Pending": String(item.docsPending),
            "Fee Due Cases": String(item.feeDueCases),
            "Outstanding Due": item.totalDue.toFixed(2),
            _detailHref: `/modules/students${buildModuleQuery({
              instituteCode: item.code,
              session: filters.session,
              yearLabel: filters.yearLabel
            })}`,
            _detailLabel: "Open Students"
          }))
      };
    }
    case "trade-demand": {
      const [students, enquiries, trades] = await Promise.all([
        prisma.student.findMany({
          where: studentWhere,
          include: {
            institute: true,
            trade: true
          }
        }),
        prisma.enquiry.findMany({
          where: buildEnquiryWhere(filters, await resolveEnquiryTradeIds(filters), false),
          select: {
            tradeId: true,
            instituteCode: true
          }
        }),
        prisma.trade.findMany({
          include: {
            institute: true
          }
        })
      ]);

      const tradeMeta = new Map(
        trades.map((trade) => [
          trade.id,
          {
            trade: trade.name,
            institute: trade.institute.name,
            instituteCode: trade.institute.instituteCode
          }
        ])
      );

      const tradeMap = new Map<
        string,
        {
          trade: string;
          institute: string;
          admissions: number;
          enquiries: number;
        }
      >();

      for (const student of students) {
        const key = `${student.trade.id}:${student.institute.instituteCode}`;
        const current = tradeMap.get(key) || {
          trade: student.trade.name,
          institute: student.institute.instituteCode,
          admissions: 0,
          enquiries: 0
        };
        current.admissions += 1;
        tradeMap.set(key, current);
      }

      for (const enquiry of enquiries) {
        if (!enquiry.tradeId) continue;
        const meta = tradeMeta.get(enquiry.tradeId);
        if (!meta) continue;
        const key = `${enquiry.tradeId}:${meta.instituteCode}`;
        const current = tradeMap.get(key) || {
          trade: meta.trade,
          institute: meta.instituteCode,
          admissions: 0,
          enquiries: 0
        };
        current.enquiries += 1;
        tradeMap.set(key, current);
      }

      return {
        key: report,
        title: "Trade Demand Report",
        description: "Trade-wise mix of active admissions and enquiries for institute demand tracking.",
        headers: ["Institute", "Trade", "Admissions", "Enquiries", "Combined Load"],
        rows: Array.from(tradeMap.values())
          .sort((a, b) => b.admissions + b.enquiries - (a.admissions + a.enquiries))
          .map((item) => ({
            Institute: item.institute,
            Trade: item.trade,
            Admissions: String(item.admissions),
            Enquiries: String(item.enquiries),
            "Combined Load": String(item.admissions + item.enquiries),
            _detailHref: `/modules/admissions${buildModuleQuery({
              instituteCode: item.institute,
              session: filters.session,
              yearLabel: filters.yearLabel
            })}`,
            _detailLabel: "Open Admissions"
          }))
      };
    }
    case "session-finance": {
      const [students, transactions] = await Promise.all([
        prisma.student.findMany({
          where: studentWhere,
          include: {
            feeProfile: true
          }
        }),
        prisma.feeTransaction.findMany({
          where: {
            student: studentWhere,
            ...buildDateRange("transactionDate", filters)
          },
          include: {
            student: true
          }
        })
      ]);

      const sessionMap = new Map<
        string,
        {
          session: string;
          students: number;
          collections: number;
          dueAmount: number;
        }
      >();

      for (const student of students) {
        const current = sessionMap.get(student.session) || {
          session: student.session,
          students: 0,
          collections: 0,
          dueAmount: 0
        };
        current.students += 1;
        current.dueAmount += Number(student.feeProfile?.dueAmount || 0);
        sessionMap.set(student.session, current);
      }

      for (const transaction of transactions) {
        const current = sessionMap.get(transaction.student.session) || {
          session: transaction.student.session,
          students: 0,
          collections: 0,
          dueAmount: 0
        };
        current.collections += Number(transaction.amountPaid || 0);
        sessionMap.set(transaction.student.session, current);
      }

      return {
        key: report,
        title: "Session Finance Report",
        description: "Session-wise student count, total collections, and outstanding fee load.",
        headers: ["Session", "Students", "Collections", "Outstanding Due"],
        rows: Array.from(sessionMap.values())
          .sort((a, b) => a.session.localeCompare(b.session))
          .map((item) => ({
            Session: item.session,
            Students: String(item.students),
            Collections: item.collections.toFixed(2),
            "Outstanding Due": item.dueAmount.toFixed(2),
            _detailHref: `/modules/fees${buildModuleQuery({
              session: item.session,
              instituteCode: filters.instituteCode,
              yearLabel: filters.yearLabel
            })}`,
            _detailLabel: "Open Fees"
          }))
      };
    }
  }
}

export function buildCsvReport(definition: ReportDefinition) {
  const headerRow = definition.headers.map(escapeCsv).join(",");
  const bodyRows = definition.rows.map((row) =>
    definition.headers.map((header) => escapeCsv(row[header] || "")).join(",")
  );

  return [headerRow, ...bodyRows].join("\n");
}
