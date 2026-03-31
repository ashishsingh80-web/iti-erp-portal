-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'ADMISSION_STAFF', 'DOCUMENT_VERIFIER', 'SCHOLARSHIP_DESK', 'FINANCE_DESK', 'PRN_SCVT_DESK', 'VIEWER');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "AdmissionMode" AS ENUM ('DIRECT', 'AGENT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "ParentRelation" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('TENTH', 'TWELFTH', 'ITI', 'DIPLOMA', 'GRADUATION', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ScholarshipStatus" AS ENUM ('NOT_APPLIED', 'APPLIED', 'UNDER_PROCESS', 'QUERY_BY_DEPARTMENT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentOwnerType" AS ENUM ('STUDENT', 'PARENT');

-- CreateEnum
CREATE TYPE "DocumentTypeCode" AS ENUM ('STUDENT_PHOTO', 'STUDENT_AADHAAR', 'PARENT_AADHAAR', 'TENTH_MARKSHEET', 'CASTE_CERTIFICATE', 'INCOME_CERTIFICATE', 'BANK_PASSBOOK', 'SIGNED_UNDERTAKING', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institute" (
    "id" TEXT NOT NULL,
    "instituteCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "tradeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "duration" TEXT,
    "ncvtScvt" TEXT,
    "standardFees" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "agentCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "defaultAgreement" TEXT,
    "defaultValue" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "agentId" TEXT,
    "createdById" TEXT,
    "admissionMode" "AdmissionMode" NOT NULL DEFAULT 'DIRECT',
    "session" TEXT NOT NULL,
    "yearLabel" TEXT NOT NULL,
    "paymentMode" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "fullName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "gender" "Gender",
    "category" TEXT,
    "address" TEXT,
    "fatherName" TEXT,
    "motherName" TEXT,
    "aadhaarMasked" TEXT,
    "aadhaarEncrypted" TEXT,
    "admissionFormStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "documentsStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "undertakingStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "eligibilityStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "completionDate" TIMESTAMP(3),
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentIdentity" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "relation" "ParentRelation" NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "aadhaarMasked" TEXT,
    "aadhaarEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationQualification" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "level" "EducationLevel" NOT NULL,
    "boardUniversity" TEXT,
    "rollNumber" TEXT,
    "passingYear" INTEGER,
    "percentage" DECIMAL(5,2),
    "isPassed" BOOLEAN NOT NULL DEFAULT false,
    "minimumEligibility" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifierRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentDocument" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentIdentityId" TEXT,
    "ownerType" "DocumentOwnerType" NOT NULL,
    "documentType" "DocumentTypeCode" NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSizeKb" INTEGER,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeProfile" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "feesIfScholarship" DECIMAL(10,2),
    "feesIfNoScholarship" DECIMAL(10,2),
    "finalFees" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dueAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "practicalExamEligible" BOOLEAN NOT NULL DEFAULT false,
    "adminOverride" BOOLEAN NOT NULL DEFAULT false,
    "finalStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeTransaction" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "referenceNo" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScholarshipRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "scholarshipId" TEXT,
    "status" "ScholarshipStatus" NOT NULL DEFAULT 'NOT_APPLIED',
    "queryText" TEXT,
    "querySubmissionDate" TIMESTAMP(3),
    "approvedDate" TIMESTAMP(3),
    "creditedAmount" DECIMAL(10,2),
    "creditDate" TIMESTAMP(3),
    "incomeCertificateOk" BOOLEAN NOT NULL DEFAULT false,
    "bankVerified" BOOLEAN NOT NULL DEFAULT false,
    "aadhaarVerified" BOOLEAN NOT NULL DEFAULT false,
    "casteCertificateOk" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScholarshipRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrnScvtRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "prnNumber" TEXT,
    "scvtRegistrationNumber" TEXT,
    "uploadDate" TIMESTAMP(3),
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrnScvtRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UndertakingRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "templateDocumentId" TEXT,
    "generatedUrl" TEXT,
    "generationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "generatedOn" TIMESTAMP(3),
    "printCount" INTEGER NOT NULL DEFAULT 0,
    "signedDocumentUrl" TEXT,
    "signedStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UndertakingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationNote" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL,
    "remarks" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "studentId" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Institute_instituteCode_key" ON "Institute"("instituteCode");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_instituteId_tradeCode_key" ON "Trade"("instituteId", "tradeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_agentCode_key" ON "Agent"("agentCode");

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentCode_key" ON "Student"("studentCode");

-- CreateIndex
CREATE INDEX "Student_fullName_mobile_idx" ON "Student"("fullName", "mobile");

-- CreateIndex
CREATE INDEX "Student_session_yearLabel_status_idx" ON "Student"("session", "yearLabel", "status");

-- CreateIndex
CREATE INDEX "EducationQualification_studentId_level_idx" ON "EducationQualification"("studentId", "level");

-- CreateIndex
CREATE INDEX "StudentDocument_studentId_documentType_idx" ON "StudentDocument"("studentId", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "FeeProfile_studentId_key" ON "FeeProfile"("studentId");

-- CreateIndex
CREATE INDEX "FeeTransaction_studentId_transactionDate_idx" ON "FeeTransaction"("studentId", "transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "ScholarshipRecord_studentId_key" ON "ScholarshipRecord"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "PrnScvtRecord_studentId_key" ON "PrnScvtRecord"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "UndertakingRecord_studentId_key" ON "UndertakingRecord"("studentId");

-- CreateIndex
CREATE INDEX "AuditLog_studentId_createdAt_idx" ON "AuditLog"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_module_createdAt_idx" ON "AuditLog"("module", "createdAt");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentIdentity" ADD CONSTRAINT "ParentIdentity_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationQualification" ADD CONSTRAINT "EducationQualification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_parentIdentityId_fkey" FOREIGN KEY ("parentIdentityId") REFERENCES "ParentIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeProfile" ADD CONSTRAINT "FeeProfile_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeTransaction" ADD CONSTRAINT "FeeTransaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipRecord" ADD CONSTRAINT "ScholarshipRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrnScvtRecord" ADD CONSTRAINT "PrnScvtRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UndertakingRecord" ADD CONSTRAINT "UndertakingRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationNote" ADD CONSTRAINT "VerificationNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
