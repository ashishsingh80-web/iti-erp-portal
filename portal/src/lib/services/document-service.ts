import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { DocumentOwnerType, DocumentTypeCode, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/audit-service";
import { evaluateWorkflow } from "@/lib/services/workflow-service";

type UploadDocumentInput = {
  studentId: string;
  documentType: string;
  ownerType: string;
  remarks?: string;
  file: File;
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function toDocumentTypeCode(value: string): DocumentTypeCode {
  if (value in DocumentTypeCode) {
    return value as DocumentTypeCode;
  }
  return DocumentTypeCode.OTHER;
}

function toDocumentOwnerType(value: string): DocumentOwnerType {
  return value === "PARENT" ? DocumentOwnerType.PARENT : DocumentOwnerType.STUDENT;
}

export async function uploadStudentDocument(input: UploadDocumentInput) {
  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
    include: {
      parents: true
    }
  });

  if (!student) {
    throw new Error("Student not found");
  }

  const bytes = Buffer.from(await input.file.arrayBuffer());
  const safeName = `${Date.now()}-${sanitizeFileName(input.file.name)}`;
  const relativeDir = path.join("uploads", input.studentId);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, safeName), bytes);

  const fileUrl = `/${relativeDir}/${safeName}`.replace(/\\/g, "/");
  const ownerType = toDocumentOwnerType(input.ownerType);
  const parentIdentityId = ownerType === DocumentOwnerType.PARENT ? student.parents[0]?.id || null : null;

  const document = await prisma.studentDocument.create({
    data: {
      studentId: input.studentId,
      parentIdentityId,
      ownerType,
      documentType: toDocumentTypeCode(input.documentType),
      originalName: input.file.name,
      fileUrl,
      storageProvider: "LOCAL_PUBLIC",
      mimeType: input.file.type || null,
      fileSizeKb: Math.max(1, Math.round(bytes.length / 1024)),
      verificationStatus: VerificationStatus.PENDING,
      remarks: input.remarks || null,
      deletedAt: null
    }
  });

  await refreshStudentDocumentStatus(input.studentId);
  await createAuditLog({
    studentId: input.studentId,
    module: "DOCUMENTS",
    action: "UPLOAD_DOCUMENT",
    metadata: {
      documentId: document.id,
      documentType: document.documentType
    }
  });

  return document;
}

export async function uploadStudentDocumentWithoutAudit(input: UploadDocumentInput) {
  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
    include: {
      parents: true
    }
  });

  if (!student) {
    throw new Error("Student not found");
  }

  const bytes = Buffer.from(await input.file.arrayBuffer());
  const safeName = `${Date.now()}-${sanitizeFileName(input.file.name)}`;
  const relativeDir = path.join("uploads", input.studentId);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, safeName), bytes);

  const fileUrl = `/${relativeDir}/${safeName}`.replace(/\\/g, "/");
  const ownerType = toDocumentOwnerType(input.ownerType);
  const parentIdentityId = ownerType === DocumentOwnerType.PARENT ? student.parents[0]?.id || null : null;

  return prisma.studentDocument.create({
    data: {
      studentId: input.studentId,
      parentIdentityId,
      ownerType,
      documentType: toDocumentTypeCode(input.documentType),
      originalName: input.file.name,
      fileUrl,
      storageProvider: "LOCAL_PUBLIC",
      mimeType: input.file.type || null,
      fileSizeKb: Math.max(1, Math.round(bytes.length / 1024)),
      verificationStatus: VerificationStatus.PENDING,
      remarks: input.remarks || null,
      deletedAt: null
    }
  });
}

export async function updateDocumentVerification(documentId: string, status: VerificationStatus, remarks?: string) {
  const document = await prisma.studentDocument.update({
    where: { id: documentId },
    data: {
      verificationStatus: status,
      remarks: remarks || null,
      verifiedAt: new Date()
    }
  });

  await refreshStudentDocumentStatus(document.studentId);
  return document;
}

export async function deleteStudentDocument(documentId: string) {
  const document = await prisma.studentDocument.findUnique({
    where: { id: documentId }
  });

  if (!document) {
    throw new Error("Document not found");
  }

  await prisma.studentDocument.update({
    where: { id: documentId }
    ,
    data: {
      deletedAt: new Date()
    }
  });

  await refreshStudentDocumentStatus(document.studentId);
  await createAuditLog({
    studentId: document.studentId,
    module: "DOCUMENTS",
    action: "SOFT_DELETE_DOCUMENT",
    metadata: {
      documentId
    }
  });

  return {
    id: document.id,
    studentId: document.studentId
  };
}

export async function refreshStudentDocumentStatus(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      scholarshipRecord: true,
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

  if (!student) {
    throw new Error("Student not found");
  }

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

  await prisma.student.update({
    where: { id: studentId },
    data: {
      documentsStatus: workflow.documentsStatus,
      status: workflow.nextStudentStatus
    }
  });
}
