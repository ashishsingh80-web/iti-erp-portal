import { prisma } from "@/lib/prisma";
import { buildFeeReceiptNumber } from "@/lib/services/accounts-service";
import { evaluateWorkflow } from "@/lib/services/workflow-service";
import type { StudentDirectoryRow, StudentProfileData } from "@/lib/types";

function getAttendanceWeight(status: string) {
  if (status === "HALF_DAY") return 0.5;
  if (status === "ABSENT") return 0;
  return 1;
}

function formatAttendanceMonth(date: Date) {
  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit"
  });
}

export type StudentDirectoryFilters = {
  ids?: string[];
  search?: string;
  agentCode?: string;
  instituteCode?: string;
  tradeName?: string;
  session?: string;
  yearLabel?: string;
  status?: string;
  documentsStatus?: string;
  eligibilityStatus?: string;
  paymentStatus?: string;
  scholarshipStatus?: string;
  missingPrn?: boolean;
  missingScvt?: boolean;
  scvtVerificationStatus?: string;
  undertakingSignedStatus?: string;
  undertakingGenerationStatus?: string;
  lifecycleStage?: string;
  archiveCategory?: string;
};

type StudentOrderKey =
  | "studentCode"
  | "fullName"
  | "unitNumber"
  | "instituteName"
  | "tradeName"
  | "session"
  | "status"
  | "documentsStatus"
  | "eligibilityStatus"
  | "dueAmount";

function buildStudentWhere(filters: StudentDirectoryFilters, search: string): any {
  return {
    deletedAt: null,
    ...(filters.ids?.length ? { id: { in: filters.ids } } : {}),
    ...(filters.session ? { session: filters.session } : {}),
    ...(filters.yearLabel ? { yearLabel: filters.yearLabel } : {}),
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.lifecycleStage ? { lifecycleStage: filters.lifecycleStage as never } : {}),
    ...(filters.archiveCategory ? { archiveCategory: filters.archiveCategory as never } : {}),
    ...(filters.documentsStatus ? { documentsStatus: filters.documentsStatus as never } : {}),
    ...(filters.eligibilityStatus ? { eligibilityStatus: filters.eligibilityStatus as never } : {}),
    ...(filters.paymentStatus
      ? {
          feeProfile: {
            paymentStatus: filters.paymentStatus as never
          }
        }
      : {}),
    ...(filters.scholarshipStatus
      ? {
          scholarshipRecord: {
            status: filters.scholarshipStatus as never
          }
        }
      : {}),
    ...(filters.missingPrn
      ? {
          prnScvtRecord: {
            prnNumber: null
          }
        }
      : {}),
    ...(filters.missingScvt
      ? {
          prnScvtRecord: {
            scvtRegistrationNumber: null
          }
        }
      : {}),
    ...(filters.scvtVerificationStatus
      ? {
          prnScvtRecord: {
            verificationStatus: filters.scvtVerificationStatus as never
          }
        }
      : {}),
    ...(filters.undertakingSignedStatus
      ? {
          undertakingRecord: {
            signedStatus: filters.undertakingSignedStatus as never
          }
        }
      : {}),
    ...(filters.undertakingGenerationStatus
      ? {
          undertakingRecord: {
            generationStatus: filters.undertakingGenerationStatus as never
          }
        }
      : {}),
    ...(filters.instituteCode
      ? {
          institute: {
            instituteCode: filters.instituteCode
          }
        }
      : {}),
    ...(filters.agentCode
      ? {
          agent: {
            agentCode: filters.agentCode
          }
        }
      : {}),
    ...(filters.tradeName
      ? {
          trade: {
            name: filters.tradeName
          }
        }
      : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { studentCode: { contains: search, mode: "insensitive" } },
            { mobile: { contains: search, mode: "insensitive" } }
          ]
        }
      : {})
  };
}

function buildStudentOrderBy(sortBy: string, sortDir: string): any {
  const dir = sortDir === "desc" ? "desc" : "asc";
  const key = sortBy as StudentOrderKey;
  if (key === "instituteName") return { institute: { name: dir } };
  if (key === "tradeName") return { trade: { name: dir } };
  if (key === "dueAmount") return { feeProfile: { dueAmount: dir } };
  if (key === "unitNumber") return { unitNumber: dir };
  if (key === "studentCode") return { studentCode: dir };
  if (key === "fullName") return { fullName: dir };
  if (key === "session") return { session: dir };
  if (key === "status") return { status: dir };
  if (key === "documentsStatus") return { documentsStatus: dir };
  if (key === "eligibilityStatus") return { eligibilityStatus: dir };
  return { createdAt: "desc" };
}

function mapDirectoryRow(row: any): StudentDirectoryRow {
  return {
    id: row.id,
    photoUrl: row.documents[0]?.fileUrl || null,
    studentCode: row.studentCode,
    fullName: row.fullName,
    instituteCode: row.institute.instituteCode,
    instituteName: row.institute.name,
    tradeName: row.trade.name,
    unitNumber: row.unitNumber ? String(row.unitNumber) : "-",
    session: row.session,
    yearLabel: row.yearLabel,
    mobile: row.mobile,
    status: row.status,
    lifecycleStage: row.lifecycleStage,
    documentsStatus: row.documentsStatus,
    eligibilityStatus: row.eligibilityStatus,
    dueAmount: row.feeProfile?.dueAmount?.toString() || "0"
  };
}

export async function listStudents(filters: StudentDirectoryFilters = {}): Promise<StudentDirectoryRow[]> {
  const search = (filters.search || "").trim().toLowerCase();
  const where = buildStudentWhere(filters, search);
  const students = await prisma.student.findMany({
    where,
    include: {
      institute: true,
      trade: true,
      feeProfile: true,
      documents: {
        where: {
          deletedAt: null,
          documentType: "STUDENT_PHOTO"
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return students.map((row) => mapDirectoryRow(row));
}

export async function listStudentsPage(
  filters: StudentDirectoryFilters = {},
  options: { page: number; pageSize: number; sortBy: string; sortDir: string }
): Promise<{ rows: StudentDirectoryRow[]; total: number }> {
  const search = (filters.search || "").trim().toLowerCase();
  const where = buildStudentWhere(filters, search);
  const page = Math.max(options.page || 1, 1);
  const pageSize = Math.max(options.pageSize || 25, 1);
  const skip = (page - 1) * pageSize;
  const orderBy = buildStudentOrderBy(options.sortBy, options.sortDir);

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: {
        institute: true,
        trade: true,
        feeProfile: true,
        documents: {
          where: {
            deletedAt: null,
            documentType: "STUDENT_PHOTO"
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        }
      },
      orderBy,
      skip,
      take: pageSize
    })
  ]);

  return {
    total,
    rows: students.map((row) => mapDirectoryRow(row))
  };
}

export async function getStudentProfile(studentId: string): Promise<StudentProfileData | null> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      institute: true,
      trade: true,
      parents: true,
      educationRecords: true,
      feeProfile: true,
      feeTransactions: {
        orderBy: {
          transactionDate: "desc"
        },
        take: 10
      },
      scholarshipRecord: true,
      prnScvtRecord: true,
      examStatusRecord: true,
      undertakingRecord: true,
      noDuesClearances: true,
      certificatePrintLogs: {
        orderBy: {
          issueDate: "desc"
        },
        take: 20
      },
      grievanceCases: {
        orderBy: {
          createdAt: "desc"
        },
        take: 10
      },
      attendanceRecords: {
        orderBy: {
          recordDate: "desc"
        },
        take: 120
      },
      documents: {
        where: {
          deletedAt: null
        },
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

  if (!student || student.deletedAt) return null;

  const parent = student.parents[0] || null;
  const education = student.educationRecords.find((item) => item.level === "TENTH") || student.educationRecords[0] || null;
  const workflow = evaluateWorkflow({
    category: student.category,
    scholarshipApplied: student.scholarshipRecord?.status === "APPLIED",
    eligibilityStatus: student.eligibilityStatus,
    currentStatus: student.status,
    documents: student.documents.map((item) => ({
      documentType: item.documentType,
      verificationStatus: item.verificationStatus
    }))
  });
  const attendanceMarkedDays = student.attendanceRecords.length;
  const attendanceUnits = student.attendanceRecords.reduce((sum, item) => sum + getAttendanceWeight(item.status), 0);
  const absentDays = student.attendanceRecords.filter((item) => item.status === "ABSENT").length;
  const attendancePercentage = attendanceMarkedDays ? ((attendanceUnits / attendanceMarkedDays) * 100).toFixed(1) : "0.0";
  const clearedDepartments = student.noDuesClearances.filter((item) => item.isCleared).length;
  const totalDepartments = student.noDuesClearances.length;
  const pendingDepartments = totalDepartments - clearedDepartments;
  const monthlyAttendanceMap = new Map<
    string,
    { monthLabel: string; totalMarkedDays: number; attendedDays: number; absentDays: number }
  >();

  for (const item of student.attendanceRecords) {
    const key = item.recordDate.toISOString().slice(0, 7);
    const existing = monthlyAttendanceMap.get(key) || {
      monthLabel: formatAttendanceMonth(item.recordDate),
      totalMarkedDays: 0,
      attendedDays: 0,
      absentDays: 0
    };

    existing.totalMarkedDays += 1;
    existing.attendedDays += getAttendanceWeight(item.status);
    if (item.status === "ABSENT") existing.absentDays += 1;
    monthlyAttendanceMap.set(key, existing);
  }

  const monthlySummary = Array.from(monthlyAttendanceMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6)
    .map(([, item]) => ({
      monthLabel: item.monthLabel,
      totalMarkedDays: item.totalMarkedDays,
      attendedDays: Number(item.attendedDays.toFixed(1)),
      absentDays: item.absentDays,
      attendancePercentage: item.totalMarkedDays ? ((item.attendedDays / item.totalMarkedDays) * 100).toFixed(1) : "0.0"
    }));

  return {
    id: student.id,
    studentCode: student.studentCode,
    admissionNumber: student.admissionNumber,
    enrollmentNumber: student.enrollmentNumber,
    photoUrl: student.documents.find((item) => item.documentType === "STUDENT_PHOTO")?.fileUrl || null,
    fullName: student.fullName,
    instituteName: student.institute.name,
    instituteCode: student.institute.instituteCode,
    tradeName: student.trade.name,
    session: student.session,
    yearLabel: student.yearLabel,
    unitNumber: student.unitNumber ? String(student.unitNumber) : null,
    status: student.status,
    admissionStatusLabel: student.admissionStatusLabel,
    admissionDate: student.admissionDate?.toISOString() || null,
    admissionType: student.admissionType,
    seatType: student.seatType,
    rollNumber: student.rollNumber,
    batchLabel: student.batchLabel,
    shiftLabel: student.shiftLabel,
    mobile: student.mobile,
    alternateMobile: student.alternateMobile,
    email: student.email,
    dateOfBirth: student.dateOfBirth?.toISOString() || null,
    gender: student.gender,
    category: student.category,
    caste: student.caste,
    religion: student.religion,
    incomeDetails: student.incomeDetails,
    domicileDetails: student.domicileDetails,
    minorityStatus: student.minorityStatus,
    disabilityStatus: student.disabilityStatus,
    maritalStatus: student.maritalStatus,
    signatureUrl: student.signatureUrl,
    address: student.address,
    fatherName: student.fatherName,
    motherName: student.motherName,
    aadhaarMasked: student.aadhaarMasked,
    paymentMode: student.paymentMode,
    parent: parent
      ? {
          relation: parent.relation,
          name: parent.name,
          mobile: parent.mobile,
          aadhaarMasked: parent.aadhaarMasked
        }
      : null,
    education: education
      ? {
        boardUniversity: education.boardUniversity,
        schoolName: education.schoolName,
        certificateNumber: education.certificateNumber,
        rollNumber: education.rollNumber,
          passingYear: education.passingYear,
          percentage: education.percentage?.toString() || null,
          isPassed: education.isPassed,
          verificationStatus: education.verificationStatus
        }
      : null,
    fees: student.feeProfile
      ? {
          collectionMode: student.feeProfile.collectionMode,
          instituteDecidedFee: student.feeProfile.instituteDecidedFee?.toString() || null,
          feesIfScholarship: student.feeProfile.feesIfScholarship?.toString() || null,
          feesIfNoScholarship: student.feeProfile.feesIfNoScholarship?.toString() || null,
          agentCommittedFee: student.feeProfile.agentCommittedFee?.toString() || null,
          scholarshipApplied: student.feeProfile.scholarshipApplied,
          convertedFromAgent: student.feeProfile.convertedFromAgent,
          conversionDate: student.feeProfile.conversionDate?.toISOString() || null,
          conversionReason: student.feeProfile.conversionReason,
          reminderCount: student.feeProfile.reminderCount,
          lastReminderDate: student.feeProfile.lastReminderDate?.toISOString() || null,
          finalFees: student.feeProfile.finalFees.toString(),
          paidAmount: student.feeProfile.paidAmount.toString(),
          dueAmount: student.feeProfile.dueAmount.toString(),
          paymentStatus: student.feeProfile.paymentStatus,
          practicalExamEligible: student.feeProfile.practicalExamEligible,
          adminOverride: student.feeProfile.adminOverride,
          finalStatus: student.feeProfile.finalStatus,
          transactions: student.feeTransactions.map((item) => ({
            id: item.id,
            receiptNo: item.receiptNumber || buildFeeReceiptNumber(item.id, item.transactionDate),
            transactionDate: item.transactionDate.toISOString(),
            amountPaid: item.amountPaid.toString(),
            paymentMode: item.paymentMode,
            referenceNo: item.referenceNo,
            remark: item.remark
          }))
        }
      : null,
    scholarship: student.scholarshipRecord
      ? {
          status: student.scholarshipRecord.status,
          scholarshipId: student.scholarshipRecord.scholarshipId,
          incomeCertificateNumber: student.scholarshipRecord.incomeCertificateNumber,
          queryText: student.scholarshipRecord.queryText,
          approvedDate: student.scholarshipRecord.approvedDate?.toISOString() || null,
          creditedAmount: student.scholarshipRecord.creditedAmount?.toString() || null,
          creditDate: student.scholarshipRecord.creditDate?.toISOString() || null,
          incomeCertificateOk: student.scholarshipRecord.incomeCertificateOk,
          bankVerified: student.scholarshipRecord.bankVerified,
          aadhaarVerified: student.scholarshipRecord.aadhaarVerified,
          casteCertificateOk: student.scholarshipRecord.casteCertificateOk
        }
      : null,
    prnScvt: student.prnScvtRecord
      ? {
          entRollNumber: student.prnScvtRecord.entRollNumber,
          admissionStatus: student.prnScvtRecord.admissionStatus,
          prnNumber: student.prnScvtRecord.prnNumber,
          scvtRegistrationNumber: student.prnScvtRecord.scvtRegistrationNumber,
          verificationStatus: student.prnScvtRecord.verificationStatus,
          uploadDate: student.prnScvtRecord.uploadDate?.toISOString() || null,
          remark: student.prnScvtRecord.remark
        }
      : null,
    examStatus: student.examStatusRecord
      ? {
          examFeePaid: student.examStatusRecord.examFeePaid,
          hallTicketIssuedOn: student.examStatusRecord.hallTicketIssuedOn?.toISOString() || null,
          tradePracticalResult: student.examStatusRecord.tradePracticalResult,
          onlineTheoryResult: student.examStatusRecord.onlineTheoryResult,
          practicalExamAppearance: student.examStatusRecord.practicalExamAppearance,
          practicalAttemptCount: student.examStatusRecord.practicalAttemptCount,
          theoryAttemptCount: student.examStatusRecord.theoryAttemptCount,
          nextPracticalAttemptDate: student.examStatusRecord.nextPracticalAttemptDate?.toISOString() || null,
          nextTheoryAttemptDate: student.examStatusRecord.nextTheoryAttemptDate?.toISOString() || null,
          practicalReappearStatus: student.examStatusRecord.practicalReappearStatus,
          theoryReappearStatus: student.examStatusRecord.theoryReappearStatus,
          practicalEligibleReappear: student.examStatusRecord.practicalEligibleReappear,
          theoryEligibleReappear: student.examStatusRecord.theoryEligibleReappear,
          adminOverrideReason: student.examStatusRecord.adminOverrideReason,
          resultPublished: student.examStatusRecord.resultPublished,
          resultDeclaredOn: student.examStatusRecord.resultDeclaredOn?.toISOString() || null,
          remark: student.examStatusRecord.remark
        }
      : null,
    undertaking: student.undertakingRecord
      ? {
          verificationCode: student.undertakingRecord.verificationCode,
          generatedUrl: student.undertakingRecord.generatedUrl,
          generationStatus: student.undertakingRecord.generationStatus,
          generatedOn: student.undertakingRecord.generatedOn?.toISOString() || null,
          printCount: student.undertakingRecord.printCount,
          signedDocumentUrl: student.undertakingRecord.signedDocumentUrl,
          signedStatus: student.undertakingRecord.signedStatus
        }
      : null,
    documents: student.documents.map((item) => ({
      id: item.id,
      documentType: item.documentType,
      ownerType: item.ownerType,
      originalName: item.originalName,
      fileUrl: item.fileUrl,
      verificationStatus: item.verificationStatus,
      remarks: item.remarks,
      createdAt: item.createdAt.toISOString()
    })),
    attendance: {
      totalMarkedDays: attendanceMarkedDays,
      attendedDays: Number(attendanceUnits.toFixed(1)),
      absentDays,
      attendancePercentage,
      monthlySummary,
      recentRecords: student.attendanceRecords.map((item) => ({
        id: item.id,
        recordDate: item.recordDate.toISOString(),
        status: item.status,
        checkInAt: item.checkInAt?.toISOString() || null,
        checkOutAt: item.checkOutAt?.toISOString() || null,
        note: item.note || null
      }))
    },
    certificates: student.certificatePrintLogs.map((item) => ({
      id: item.id,
      certificateType: item.certificateType,
      certificateNumber: item.certificateNumber,
      verificationCode: item.verificationCode,
      issueDate: item.issueDate.toISOString(),
      printCount: item.printCount,
      lastPrintedAt: item.lastPrintedAt?.toISOString() || null,
      note: item.note || null
    })),
    noDues: {
      totalDepartments,
      clearedDepartments,
      pendingDepartments,
      isReady: totalDepartments > 0 && pendingDepartments === 0
    },
    supportCases: student.grievanceCases.map((item) => ({
      id: item.id,
      grievanceNo: item.grievanceNo,
      category: item.category,
      title: item.title,
      priority: item.priority,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      resolutionNote: item.resolutionNote || null
    })),
    workflow: {
      documentsStatus: workflow.documentsStatus,
      nextStudentStatus: workflow.nextStudentStatus,
      blockers: workflow.blockers,
      rules: workflow.rules.map((item) => ({
        code: item.code,
        label: item.label,
        required: item.required,
        uploaded: item.uploaded,
        verificationStatus: item.verificationStatus
      }))
    }
  };
}
