import { CertificateType, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function buildExamBlockers(input: {
  examFeePaid: boolean;
  feeDueAmount: number;
  noDuesReady: boolean;
  documentsStatus: string;
  eligibilityStatus: string;
  practicalExamEligible: boolean;
  adminOverride: boolean;
}) {
  const blockers: string[] = [];
  if (!input.examFeePaid) blockers.push("Exam fee pending");
  if (input.feeDueAmount > 0) blockers.push("Institute fee due");
  if (!input.noDuesReady) blockers.push("No dues not cleared");
  if (input.documentsStatus !== VerificationStatus.VERIFIED) blockers.push("Documents not verified");
  if (input.eligibilityStatus !== VerificationStatus.VERIFIED) blockers.push("Eligibility not verified");
  if (!input.practicalExamEligible && !input.adminOverride) blockers.push("Practical permission pending");
  return blockers;
}

export async function listExamDeskRows(search = "") {
  const students = await prisma.student.findMany({
    where: {
      deletedAt: null,
      ...(search.trim()
        ? {
            OR: [
              { fullName: { startsWith: search.trim(), mode: "insensitive" } },
              { studentCode: { startsWith: search.trim(), mode: "insensitive" } },
              { mobile: { startsWith: search.trim() } }
            ]
          }
        : {})
    },
    include: {
      institute: true,
      trade: true,
      feeProfile: true,
      examStatusRecord: true,
      noDuesClearances: true
    },
    orderBy: { updatedAt: "desc" },
    take: 100
  });

  return students.map((student) => {
    const exam = student.examStatusRecord;
    const feeDueAmount = Number(student.feeProfile?.dueAmount || 0);
    const noDuesReady =
      student.noDuesClearances.length > 0 &&
      student.noDuesClearances.every((item) => item.isCleared);
    const hallTicketReady =
      Boolean(exam?.examFeePaid) &&
      feeDueAmount <= 0 &&
      noDuesReady &&
      student.documentsStatus === VerificationStatus.VERIFIED &&
      student.eligibilityStatus === VerificationStatus.VERIFIED;
    const practicalPermissionReady =
      hallTicketReady && Boolean(student.feeProfile?.practicalExamEligible || student.feeProfile?.adminOverride);
    const blockers = buildExamBlockers({
      examFeePaid: Boolean(exam?.examFeePaid),
      feeDueAmount,
      noDuesReady,
      documentsStatus: student.documentsStatus,
      eligibilityStatus: student.eligibilityStatus,
      practicalExamEligible: Boolean(student.feeProfile?.practicalExamEligible),
      adminOverride: Boolean(student.feeProfile?.adminOverride)
    });

    return {
      id: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      instituteName: student.institute.name,
      tradeName: student.trade.name,
      session: student.session,
      yearLabel: student.yearLabel,
      examFeePaid: Boolean(exam?.examFeePaid),
      hallTicketReady,
      hallTicketIssuedOn: exam?.hallTicketIssuedOn?.toISOString().slice(0, 10) || "",
      practicalPermissionReady,
      practicalResult: exam?.tradePracticalResult || "NOT_DECLARED",
      theoryResult: exam?.onlineTheoryResult || "NOT_DECLARED",
      resultPublished: Boolean(exam?.resultPublished),
      resultDeclaredOn: exam?.resultDeclaredOn?.toISOString().slice(0, 10) || "",
      adminOverrideReason: exam?.adminOverrideReason || "",
      hasOverride: Boolean(exam?.adminOverrideReason),
      practicalAdminOverride: Boolean(student.feeProfile?.adminOverride),
      feeDueAmount: feeDueAmount.toFixed(2),
      documentsStatus: student.documentsStatus,
      eligibilityStatus: student.eligibilityStatus,
      blockers
    };
  });
}

export async function getExamDeskSummary() {
  const rows = await listExamDeskRows();
  return {
    total: rows.length,
    hallTicketReady: rows.filter((item) => item.hallTicketReady).length,
    practicalPermissionReady: rows.filter((item) => item.practicalPermissionReady).length,
    resultPublished: rows.filter((item) => item.resultPublished).length,
    blocked: rows.filter((item) => item.blockers.length > 0).length,
    overrides: rows.filter((item) => item.hasOverride).length
  };
}

export async function getExamReasonSummary(search = "") {
  const rows = await listExamDeskRows(search);
  const blockerMap = new Map<string, number>();

  for (const row of rows) {
    for (const blocker of row.blockers) {
      blockerMap.set(blocker, (blockerMap.get(blocker) || 0) + 1);
    }
  }

  return Array.from(blockerMap.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

export async function listExamOverrideRows(search = "") {
  const rows = await listExamDeskRows(search);

  return rows
    .filter((row) => row.hasOverride || row.practicalAdminOverride)
    .sort((left, right) => {
      if (left.hasOverride !== right.hasOverride) return left.hasOverride ? -1 : 1;
      if (left.practicalAdminOverride !== right.practicalAdminOverride) return left.practicalAdminOverride ? -1 : 1;
      return left.fullName.localeCompare(right.fullName);
    });
}

export async function listHallTicketIssueRows(search = "") {
  const rows = await prisma.certificatePrintLog.findMany({
    where: {
      certificateType: CertificateType.HALL_TICKET,
      ...(search.trim()
        ? {
            student: {
              OR: [
                { fullName: { startsWith: search.trim(), mode: "insensitive" } },
                { studentCode: { startsWith: search.trim(), mode: "insensitive" } },
                { mobile: { startsWith: search.trim() } }
              ]
            }
          }
        : {})
    },
    include: {
      issuedBy: true,
      student: {
        include: {
          institute: true,
          trade: true,
          examStatusRecord: true
        }
      }
    },
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    take: 100
  });

  return rows.map((row) => ({
    id: row.id,
    certificateNumber: row.certificateNumber,
    verificationCode: row.verificationCode,
    issueDate: row.issueDate.toISOString().slice(0, 10),
    printCount: row.printCount,
    lastPrintedAt: row.lastPrintedAt?.toISOString().slice(0, 10) || "",
    issuedBy: row.issuedBy?.name || row.issuedBy?.email || "System",
    studentId: row.studentId,
    studentCode: row.student.studentCode,
    fullName: row.student.fullName,
    instituteName: row.student.institute.name,
    tradeName: row.student.trade.name,
    session: row.student.session,
    yearLabel: row.student.yearLabel,
    hallTicketIssuedOn: row.student.examStatusRecord?.hallTicketIssuedOn?.toISOString().slice(0, 10) || ""
  }));
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

export async function buildExamStatusCsv(kind: "eligibility" | "results" | "overrides" | "hall-ticket", search = "") {
  const rows = await listExamDeskRows(search);

  if (kind === "results") {
    const headers = [
      "Student Code",
      "Student Name",
      "Institute",
      "Trade",
      "Session",
      "Year",
      "Practical Result",
      "Theory Result",
      "Result Published",
      "Result Declared On",
      "Override Reason"
    ];

    const body = rows.map((row) =>
      [
        row.studentCode,
        row.fullName,
        row.instituteName,
        row.tradeName,
        row.session,
        row.yearLabel,
        row.practicalResult,
        row.theoryResult,
        row.resultPublished ? "Yes" : "No",
        row.resultDeclaredOn || "",
        row.adminOverrideReason || ""
      ]
        .map(escapeCsv)
        .join(",")
    );

    return [headers.join(","), ...body].join("\n");
  }

  if (kind === "overrides") {
    const overrideRows = await listExamOverrideRows(search);
    const headers = [
      "Student Code",
      "Student Name",
      "Institute",
      "Trade",
      "Session",
      "Year",
      "Practical Admin Override",
      "Exam Override Reason",
      "Hall Ticket Issued On",
      "Documents Status",
      "Eligibility Status",
      "Fee Due Amount",
      "Blockers"
    ];

    const body = overrideRows.map((row) =>
      [
        row.studentCode,
        row.fullName,
        row.instituteName,
        row.tradeName,
        row.session,
        row.yearLabel,
        row.practicalAdminOverride ? "Yes" : "No",
        row.adminOverrideReason || "",
        row.hallTicketIssuedOn || "",
        row.documentsStatus,
        row.eligibilityStatus,
        row.feeDueAmount,
        row.blockers.join(" | ")
      ]
        .map(escapeCsv)
        .join(",")
    );

    return [headers.join(","), ...body].join("\n");
  }

  if (kind === "hall-ticket") {
    const hallTicketRows = await listHallTicketIssueRows(search);
    const headers = [
      "Issue Date",
      "Certificate Number",
      "Verification Code",
      "Student Code",
      "Student Name",
      "Institute",
      "Trade",
      "Session",
      "Year",
      "Exam Hall Ticket Marked On",
      "Issued By",
      "Print Count",
      "Last Printed On"
    ];

    const body = hallTicketRows.map((row) =>
      [
        row.issueDate,
        row.certificateNumber,
        row.verificationCode,
        row.studentCode,
        row.fullName,
        row.instituteName,
        row.tradeName,
        row.session,
        row.yearLabel,
        row.hallTicketIssuedOn,
        row.issuedBy,
        String(row.printCount),
        row.lastPrintedAt
      ]
        .map(escapeCsv)
        .join(",")
    );

    return [headers.join(","), ...body].join("\n");
  }

  const headers = [
    "Student Code",
    "Student Name",
    "Institute",
    "Trade",
    "Session",
    "Year",
    "Exam Fee Paid",
    "Hall Ticket Ready",
    "Practical Permission Ready",
    "Fee Due Amount",
    "Blockers"
  ];

  const body = rows.map((row) =>
    [
      row.studentCode,
      row.fullName,
      row.instituteName,
      row.tradeName,
      row.session,
      row.yearLabel,
      row.examFeePaid ? "Yes" : "No",
      row.hallTicketReady ? "Yes" : "No",
      row.practicalPermissionReady ? "Yes" : "No",
      row.feeDueAmount,
      row.blockers.join(" | ")
    ]
      .map(escapeCsv)
      .join(",")
  );

  return [headers.join(","), ...body].join("\n");
}
