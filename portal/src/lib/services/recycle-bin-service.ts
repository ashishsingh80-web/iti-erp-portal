import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/audit-service";
import { refreshStudentDocumentStatus } from "@/lib/services/document-service";

export async function softDeleteStudent(studentId: string, currentUserId?: string | null) {
  const student = await prisma.student.findUnique({
    where: { id: studentId }
  });

  if (!student || student.deletedAt) {
    throw new Error("Student not found");
  }

  await prisma.student.update({
    where: { id: studentId },
    data: {
      deletedAt: new Date()
    }
  });

  await createAuditLog({
    userId: currentUserId,
    studentId,
    module: "STUDENTS",
    action: "SOFT_DELETE_STUDENT"
  });

  return { id: studentId };
}

export async function restoreStudent(studentId: string, currentUserId?: string | null) {
  const student = await prisma.student.findUnique({
    where: { id: studentId }
  });

  if (!student || !student.deletedAt) {
    throw new Error("Deleted student not found");
  }

  await prisma.student.update({
    where: { id: studentId },
    data: {
      deletedAt: null
    }
  });

  await createAuditLog({
    userId: currentUserId,
    studentId,
    module: "STUDENTS",
    action: "RESTORE_STUDENT"
  });

  return { id: studentId };
}

export async function restoreDocument(documentId: string, currentUserId?: string | null) {
  const document = await prisma.studentDocument.findUnique({
    where: { id: documentId }
  });

  if (!document || !document.deletedAt) {
    throw new Error("Deleted document not found");
  }

  await prisma.studentDocument.update({
    where: { id: documentId },
    data: {
      deletedAt: null
    }
  });

  await refreshStudentDocumentStatus(document.studentId);

  await createAuditLog({
    userId: currentUserId,
    studentId: document.studentId,
    module: "DOCUMENTS",
    action: "RESTORE_DOCUMENT",
    metadata: {
      documentId
    }
  });

  return { id: documentId };
}

export async function listDeletedRecords() {
  const [students, documents] = await Promise.all([
    prisma.student.findMany({
      where: {
        deletedAt: {
          not: null
        }
      },
      include: {
        institute: true,
        trade: true
      },
      orderBy: {
        deletedAt: "desc"
      },
      take: 100
    }),
    prisma.studentDocument.findMany({
      where: {
        deletedAt: {
          not: null
        }
      },
      include: {
        student: true
      },
      orderBy: {
        deletedAt: "desc"
      },
      take: 100
    })
  ]);

  return {
    students: students.map((item) => ({
      id: item.id,
      studentCode: item.studentCode,
      fullName: item.fullName,
      instituteName: item.institute.name,
      tradeName: item.trade.name,
      deletedAt: item.deletedAt?.toISOString() || ""
    })),
    documents: documents.map((item) => ({
      id: item.id,
      studentId: item.studentId,
      studentCode: item.student.studentCode,
      studentName: item.student.fullName,
      documentType: item.documentType,
      originalName: item.originalName,
      deletedAt: item.deletedAt?.toISOString() || ""
    }))
  };
}
