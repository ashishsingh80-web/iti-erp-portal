import { DocumentTypeCode, Prisma, StudentLifecycleStage, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildSessionVariants } from "@/lib/session-config";

export type WorkbenchQueue = "all" | "pending_any" | "docs" | "upload" | "form" | "eligibility";

export type WorkbenchStudentRow = {
  id: string;
  studentCode: string;
  fullName: string;
  mobile: string;
  session: string;
  yearLabel: string;
  instituteName: string;
  tradeName: string;
  photoUrl: string | null;
  admissionFormStatus: string;
  documentsStatus: string;
  eligibilityStatus: string;
  undertakingSigned: string | null;
};

function queueWhere(queue: WorkbenchQueue): Prisma.StudentWhereInput {
  if (queue === "pending_any") {
    return {
      OR: [
        { admissionFormStatus: { not: VerificationStatus.VERIFIED } },
        { documentsStatus: { not: VerificationStatus.VERIFIED } },
        { eligibilityStatus: { not: VerificationStatus.VERIFIED } }
      ]
    };
  }
  if (queue === "docs") {
    return { documentsStatus: { not: VerificationStatus.VERIFIED } };
  }
  if (queue === "upload") {
    return {
      AND: [
        { documentsStatus: { not: VerificationStatus.VERIFIED } },
        {
          NOT: {
            documents: {
              some: {
                deletedAt: null,
                documentType: DocumentTypeCode.STUDENT_PHOTO
              }
            }
          }
        }
      ]
    };
  }
  if (queue === "form") {
    return { admissionFormStatus: { not: VerificationStatus.VERIFIED } };
  }
  if (queue === "eligibility") {
    return { eligibilityStatus: { not: VerificationStatus.VERIFIED } };
  }
  return {};
}

export async function listWorkbenchStudentsPage(params: {
  queue: WorkbenchQueue;
  session?: string;
  search?: string;
  page: number;
  pageSize: number;
}): Promise<{ rows: WorkbenchStudentRow[]; total: number }> {
  const page = Math.max(1, params.page);
  const pageSize = Math.min(100, Math.max(5, params.pageSize));
  const search = (params.search || "").trim();
  const sessionVariants = params.session?.trim() ? buildSessionVariants(params.session.trim()) : [];

  const where: Prisma.StudentWhereInput = {
    deletedAt: null,
    lifecycleStage: { in: [StudentLifecycleStage.ACTIVE, StudentLifecycleStage.PROMOTED] },
    ...queueWhere(params.queue),
    ...(sessionVariants.length ? { session: { in: sessionVariants } } : {}),
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

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: {
        institute: { select: { name: true } },
        trade: { select: { name: true } },
        undertakingRecord: { select: { signedStatus: true } },
        documents: {
          where: { deletedAt: null, documentType: "STUDENT_PHOTO" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { fileUrl: true }
        }
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  const rows: WorkbenchStudentRow[] = students.map((s) => ({
    id: s.id,
    studentCode: s.studentCode,
    fullName: s.fullName,
    mobile: s.mobile,
    session: s.session,
    yearLabel: s.yearLabel,
    instituteName: s.institute.name,
    tradeName: s.trade.name,
    photoUrl: s.documents[0]?.fileUrl ?? null,
    admissionFormStatus: s.admissionFormStatus,
    documentsStatus: s.documentsStatus,
    eligibilityStatus: s.eligibilityStatus,
    undertakingSigned: s.undertakingRecord?.signedStatus ?? null
  }));

  return { rows, total };
}
