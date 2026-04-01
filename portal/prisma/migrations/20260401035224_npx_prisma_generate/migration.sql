/*
  Warnings:

  - A unique constraint covering the columns `[feeTransactionId]` on the table `AccountEntry` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[receiptNumber]` on the table `FeeTransaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[verificationCode]` on the table `UndertakingRecord` will be added. If there are existing duplicate values, this will fail.
  - The required column `verificationCode` was added to the `UndertakingRecord` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "StudentLifecycleStage" AS ENUM ('ACTIVE', 'PROMOTED', 'ALUMNI', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StudentArchiveCategory" AS ENUM ('SUSPECTED', 'INACTIVE_LEFT');

-- CreateEnum
CREATE TYPE "HrSalaryType" AS ENUM ('MONTHLY', 'DAILY_WAGE', 'CONTRACT');

-- CreateEnum
CREATE TYPE "HrEmploymentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "HrStaffCategory" AS ENUM ('TECHNICAL_CTI', 'TECHNICAL_NON_CTI', 'NON_TECHNICAL_TEACHING', 'NON_TEACHING');

-- CreateEnum
CREATE TYPE "HrQualificationLevel" AS ENUM ('TENTH', 'TWELFTH', 'ITI', 'DIPLOMA', 'BTECH_BE', 'GRADUATION', 'POST_GRADUATION', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendancePersonType" AS ENUM ('STUDENT', 'STAFF');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY');

-- CreateEnum
CREATE TYPE "ExamResultStatus" AS ENUM ('NOT_DECLARED', 'PASS', 'FAIL');

-- CreateEnum
CREATE TYPE "ExamAppearanceStatus" AS ENUM ('NOT_APPEARED', 'APPEARED');

-- CreateEnum
CREATE TYPE "ReappearStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'SCHEDULED', 'COMPLETED', 'NOT_ELIGIBLE');

-- CreateEnum
CREATE TYPE "NoDuesDepartment" AS ENUM ('ACCOUNTS', 'WORKSHOP', 'STORE', 'LIBRARY', 'DOCUMENTS', 'ID_CARD');

-- CreateEnum
CREATE TYPE "InventoryDepartment" AS ENUM ('STORE', 'WORKSHOP');

-- CreateEnum
CREATE TYPE "InventoryIssueStatus" AS ENUM ('ISSUED', 'PARTIAL_RETURNED', 'RETURNED');

-- CreateEnum
CREATE TYPE "LibraryIssueStatus" AS ENUM ('ISSUED', 'RETURNED');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('BONAFIDE', 'CHARACTER', 'NO_DUES', 'PRACTICAL_PERMISSION', 'HALL_TICKET');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'FOLLOW_UP', 'VISIT_SCHEDULED', 'COUNSELLED', 'INTERESTED', 'DOCUMENTS_PENDING', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "EnquirySource" AS ENUM ('WALK_IN', 'CALL', 'AGENT', 'REFERRAL', 'CAMP', 'SOCIAL_MEDIA', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL', 'CALL');

-- CreateEnum
CREATE TYPE "CommunicationTargetType" AS ENUM ('STUDENT', 'PARENT', 'AGENT', 'ENQUIRY', 'STAFF');

-- CreateEnum
CREATE TYPE "CommunicationLogStatus" AS ENUM ('DRAFT', 'READY', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "GrievancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "GrievanceStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'ACTION_IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "GrievanceTargetType" AS ENUM ('GENERAL', 'STUDENT', 'STAFF');

-- CreateEnum
CREATE TYPE "PlacementStatus" AS ENUM ('INTERESTED', 'APPLIED', 'SELECTED', 'OFFERED', 'JOINED', 'REJECTED', 'NOT_JOINED');

-- CreateEnum
CREATE TYPE "ApprenticeshipStatus" AS ENUM ('NOT_STARTED', 'APPLIED', 'UNDER_PROCESS', 'ACTIVE', 'COMPLETED');

-- AlterEnum
ALTER TYPE "AccountEntryType" ADD VALUE 'OPENING_BALANCE';

-- AlterTable
ALTER TABLE "AccountEntry" ADD COLUMN     "feeTransactionId" TEXT,
ADD COLUMN     "studentId" TEXT;

-- AlterTable
ALTER TABLE "EducationQualification" ADD COLUMN     "certificateNumber" TEXT,
ADD COLUMN     "schoolName" TEXT;

-- AlterTable
ALTER TABLE "FeeTransaction" ADD COLUMN     "receiptNumber" TEXT;

-- AlterTable
ALTER TABLE "Institute" ADD COLUMN     "scvtCode" TEXT,
ADD COLUMN     "sidhCode" TEXT;

-- AlterTable
ALTER TABLE "PrnScvtRecord" ADD COLUMN     "admissionStatus" TEXT,
ADD COLUMN     "entRollNumber" TEXT;

-- AlterTable
ALTER TABLE "ScholarshipRecord" ADD COLUMN     "incomeCertificateNumber" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "admissionDate" DATE,
ADD COLUMN     "admissionNumber" TEXT,
ADD COLUMN     "admissionStatusLabel" TEXT,
ADD COLUMN     "admissionType" TEXT,
ADD COLUMN     "alternateMobile" TEXT,
ADD COLUMN     "alumniAt" TIMESTAMP(3),
ADD COLUMN     "archiveCategory" "StudentArchiveCategory",
ADD COLUMN     "archiveNote" TEXT,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "areaVillage" TEXT,
ADD COLUMN     "batchLabel" TEXT,
ADD COLUMN     "block" TEXT,
ADD COLUMN     "caste" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "dateOfBirth" DATE,
ADD COLUMN     "disabilityStatus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "domicileDetails" TEXT,
ADD COLUMN     "enrollmentNumber" TEXT,
ADD COLUMN     "incomeDetails" TEXT,
ADD COLUMN     "lifecycleStage" "StudentLifecycleStage" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "minorityStatus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "promotedAt" TIMESTAMP(3),
ADD COLUMN     "religion" TEXT,
ADD COLUMN     "rollNumber" TEXT,
ADD COLUMN     "seatType" TEXT,
ADD COLUMN     "shiftLabel" TEXT,
ADD COLUMN     "signatureUrl" TEXT,
ADD COLUMN     "stateName" TEXT,
ADD COLUMN     "tehsil" TEXT,
ADD COLUMN     "unitNumber" INTEGER,
ADD COLUMN     "ward" TEXT;

-- AlterTable
ALTER TABLE "UndertakingRecord" ADD COLUMN     "signedDocumentHash" TEXT,
ADD COLUMN     "verificationCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "dateOfBirth" DATE,
ADD COLUMN     "designation" TEXT,
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "mobile" TEXT,
ADD COLUMN     "motherName" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "spouseName" TEXT;

-- CreateTable
CREATE TABLE "TimetableEntry" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "yearLabel" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "subjectTitle" TEXT NOT NULL,
    "instructorName" TEXT,
    "roomLabel" TEXT,
    "batchLabel" TEXT,
    "isPractical" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetablePublication" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "yearLabel" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetablePublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "parentMobile" TEXT,
    "instituteCode" TEXT,
    "tradeId" TEXT,
    "qualification" TEXT,
    "category" TEXT,
    "address" TEXT,
    "source" "EnquirySource" NOT NULL DEFAULT 'WALK_IN',
    "enquiryDate" DATE NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "nextFollowUpDate" DATE,
    "lastContactDate" DATE,
    "assignedCounsellor" TEXT,
    "budgetConcern" TEXT,
    "scholarshipInterest" BOOLEAN NOT NULL DEFAULT false,
    "admissionMode" "AdmissionMode",
    "agentName" TEXT,
    "notes" TEXT,
    "followUpNotes" TEXT,
    "lostReason" TEXT,
    "convertedAt" TIMESTAMP(3),
    "convertedStudentId" TEXT,
    "convertedStudentCode" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrStaff" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "fatherName" TEXT,
    "motherName" TEXT,
    "spouseName" TEXT,
    "dateOfBirth" DATE,
    "joiningDate" DATE,
    "designation" TEXT,
    "department" TEXT,
    "staffCategory" "HrStaffCategory" NOT NULL DEFAULT 'NON_TEACHING',
    "academicQualification" TEXT,
    "academicSpecialization" TEXT,
    "academicPassingYear" INTEGER,
    "technicalQualification" TEXT,
    "technicalSpecialization" TEXT,
    "technicalPassingYear" INTEGER,
    "isCtiHolder" BOOLEAN NOT NULL DEFAULT false,
    "ctiPassingYear" INTEGER,
    "ctiTrade" TEXT,
    "ctiInstituteName" TEXT,
    "ctiPercentage" DECIMAL(5,2),
    "ctiDocumentUrl" TEXT,
    "ctiDocumentName" TEXT,
    "salaryType" "HrSalaryType" NOT NULL DEFAULT 'MONTHLY',
    "monthlySalary" DECIMAL(12,2),
    "mobile" TEXT,
    "alternateMobile" TEXT,
    "email" TEXT,
    "aadhaarNo" TEXT,
    "panNo" TEXT,
    "aadhaarDocumentUrl" TEXT,
    "aadhaarDocumentName" TEXT,
    "panDocumentUrl" TEXT,
    "panDocumentName" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "addressLine" TEXT,
    "photoUrl" TEXT,
    "isGovtRecordOnly" BOOLEAN NOT NULL DEFAULT false,
    "isExperienceCase" BOOLEAN NOT NULL DEFAULT false,
    "experienceFromDate" DATE,
    "experienceToDate" DATE,
    "agreementEndDate" DATE,
    "agreedMonthlyAmount" DECIMAL(12,2),
    "experienceNote" TEXT,
    "employmentStatus" "HrEmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrQualification" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "level" "HrQualificationLevel" NOT NULL,
    "specialization" TEXT,
    "boardUniversity" TEXT,
    "passingYear" INTEGER,
    "percentage" DECIMAL(5,2),
    "documentUrl" TEXT,
    "documentName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrPayment" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "paymentMonth" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "deductionsAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "referenceNo" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrLeaveRecord" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "totalDays" DECIMAL(6,2) NOT NULL DEFAULT 1,
    "reason" TEXT,
    "approvalNote" TEXT,
    "approvedById" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrLeaveRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountDayClosure" (
    "id" TEXT NOT NULL,
    "closedDate" TIMESTAMP(3) NOT NULL,
    "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountDayClosure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBill" (
    "id" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "materialDescription" TEXT,
    "billDate" TIMESTAMP(3) NOT NULL,
    "referenceNo" TEXT,
    "note" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dueAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPayment" (
    "id" TEXT NOT NULL,
    "vendorBillId" TEXT NOT NULL,
    "accountEntryId" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "referenceNo" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentNoDuesClearance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "department" "NoDuesDepartment" NOT NULL,
    "isCleared" BOOLEAN NOT NULL DEFAULT false,
    "clearanceDate" DATE,
    "remark" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentNoDuesClearance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "department" "InventoryDepartment" NOT NULL,
    "unitLabel" TEXT NOT NULL DEFAULT 'pcs',
    "currentStock" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reorderLevel" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "storageLocation" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryIssue" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "quantityIssued" DECIMAL(12,2) NOT NULL,
    "quantityReturned" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "issueDate" DATE NOT NULL,
    "expectedReturnDate" DATE,
    "lastReturnDate" DATE,
    "status" "InventoryIssueStatus" NOT NULL DEFAULT 'ISSUED',
    "remark" TEXT,
    "issuedById" TEXT,
    "returnedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryBook" (
    "id" TEXT NOT NULL,
    "accessionNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authorName" TEXT,
    "category" TEXT,
    "publisherName" TEXT,
    "editionLabel" TEXT,
    "totalCopies" INTEGER NOT NULL DEFAULT 1,
    "availableCopies" INTEGER NOT NULL DEFAULT 1,
    "shelfLocation" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryIssue" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "issueDate" DATE NOT NULL,
    "expectedReturnDate" DATE,
    "returnDate" DATE,
    "status" "LibraryIssueStatus" NOT NULL DEFAULT 'ISSUED',
    "remark" TEXT,
    "issuedById" TEXT,
    "returnedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificatePrintLog" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "certificateType" "CertificateType" NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "printCount" INTEGER NOT NULL DEFAULT 1,
    "lastPrintedAt" TIMESTAMP(3),
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "issuedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificatePrintLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamStatusRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examFeePaid" BOOLEAN NOT NULL DEFAULT false,
    "hallTicketIssuedOn" DATE,
    "tradePracticalResult" "ExamResultStatus" NOT NULL DEFAULT 'NOT_DECLARED',
    "onlineTheoryResult" "ExamResultStatus" NOT NULL DEFAULT 'NOT_DECLARED',
    "practicalExamAppearance" "ExamAppearanceStatus" NOT NULL DEFAULT 'NOT_APPEARED',
    "practicalAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "theoryAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextPracticalAttemptDate" DATE,
    "nextTheoryAttemptDate" DATE,
    "practicalReappearStatus" "ReappearStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "theoryReappearStatus" "ReappearStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "practicalEligibleReappear" BOOLEAN NOT NULL DEFAULT true,
    "theoryEligibleReappear" BOOLEAN NOT NULL DEFAULT true,
    "adminOverrideReason" TEXT,
    "resultPublished" BOOLEAN NOT NULL DEFAULT false,
    "resultDeclaredOn" DATE,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamStatusRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "personType" "AttendancePersonType" NOT NULL,
    "studentId" TEXT,
    "staffId" TEXT,
    "recordDate" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "subjectLine" TEXT,
    "bodyText" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationLog" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "channel" "CommunicationChannel" NOT NULL,
    "targetType" "CommunicationTargetType" NOT NULL,
    "targetId" TEXT,
    "targetName" TEXT NOT NULL,
    "targetMobile" TEXT,
    "targetEmail" TEXT,
    "subjectLine" TEXT,
    "bodyText" TEXT NOT NULL,
    "status" "CommunicationLogStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrievanceCase" (
    "id" TEXT NOT NULL,
    "grievanceNo" TEXT NOT NULL,
    "targetType" "GrievanceTargetType" NOT NULL DEFAULT 'GENERAL',
    "studentId" TEXT,
    "staffId" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "GrievancePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "GrievanceStatus" NOT NULL DEFAULT 'OPEN',
    "reportedByName" TEXT,
    "reportedByMobile" TEXT,
    "assignedToName" TEXT,
    "actionTaken" TEXT,
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrievanceCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementCompany" (
    "id" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "addressLine" TEXT,
    "industryType" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "companyId" TEXT,
    "employerName" TEXT NOT NULL,
    "designation" TEXT,
    "locationName" TEXT,
    "salaryOffered" DECIMAL(12,2),
    "placementStatus" "PlacementStatus" NOT NULL DEFAULT 'INTERESTED',
    "apprenticeshipStatus" "ApprenticeshipStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "offerDate" DATE,
    "joiningDate" DATE,
    "completionDate" DATE,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimetableEntry_instituteId_tradeId_session_yearLabel_dayOfW_idx" ON "TimetableEntry"("instituteId", "tradeId", "session", "yearLabel", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "TimetablePublication_instituteId_tradeId_session_yearLabel_key" ON "TimetablePublication"("instituteId", "tradeId", "session", "yearLabel");

-- CreateIndex
CREATE INDEX "Enquiry_status_enquiryDate_idx" ON "Enquiry"("status", "enquiryDate");

-- CreateIndex
CREATE INDEX "Enquiry_mobile_fullName_idx" ON "Enquiry"("mobile", "fullName");

-- CreateIndex
CREATE UNIQUE INDEX "HrStaff_employeeCode_key" ON "HrStaff"("employeeCode");

-- CreateIndex
CREATE INDEX "HrQualification_staffId_level_idx" ON "HrQualification"("staffId", "level");

-- CreateIndex
CREATE INDEX "HrPayment_staffId_paymentDate_idx" ON "HrPayment"("staffId", "paymentDate");

-- CreateIndex
CREATE INDEX "HrPayment_paymentMonth_paymentDate_idx" ON "HrPayment"("paymentMonth", "paymentDate");

-- CreateIndex
CREATE INDEX "HrLeaveRecord_staffId_fromDate_toDate_idx" ON "HrLeaveRecord"("staffId", "fromDate", "toDate");

-- CreateIndex
CREATE INDEX "HrLeaveRecord_status_leaveType_createdAt_idx" ON "HrLeaveRecord"("status", "leaveType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountDayClosure_closedDate_key" ON "AccountDayClosure"("closedDate");

-- CreateIndex
CREATE INDEX "VendorBill_vendorName_billDate_idx" ON "VendorBill"("vendorName", "billDate");

-- CreateIndex
CREATE UNIQUE INDEX "VendorPayment_accountEntryId_key" ON "VendorPayment"("accountEntryId");

-- CreateIndex
CREATE INDEX "VendorPayment_vendorBillId_paymentDate_idx" ON "VendorPayment"("vendorBillId", "paymentDate");

-- CreateIndex
CREATE INDEX "StudentNoDuesClearance_department_isCleared_idx" ON "StudentNoDuesClearance"("department", "isCleared");

-- CreateIndex
CREATE UNIQUE INDEX "StudentNoDuesClearance_studentId_department_key" ON "StudentNoDuesClearance"("studentId", "department");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_itemCode_key" ON "InventoryItem"("itemCode");

-- CreateIndex
CREATE INDEX "InventoryItem_department_isActive_idx" ON "InventoryItem"("department", "isActive");

-- CreateIndex
CREATE INDEX "InventoryItem_itemName_idx" ON "InventoryItem"("itemName");

-- CreateIndex
CREATE INDEX "InventoryIssue_studentId_status_idx" ON "InventoryIssue"("studentId", "status");

-- CreateIndex
CREATE INDEX "InventoryIssue_itemId_status_idx" ON "InventoryIssue"("itemId", "status");

-- CreateIndex
CREATE INDEX "InventoryIssue_issueDate_status_idx" ON "InventoryIssue"("issueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryBook_accessionNumber_key" ON "LibraryBook"("accessionNumber");

-- CreateIndex
CREATE INDEX "LibraryBook_title_idx" ON "LibraryBook"("title");

-- CreateIndex
CREATE INDEX "LibraryBook_category_isActive_idx" ON "LibraryBook"("category", "isActive");

-- CreateIndex
CREATE INDEX "LibraryIssue_studentId_status_idx" ON "LibraryIssue"("studentId", "status");

-- CreateIndex
CREATE INDEX "LibraryIssue_bookId_status_idx" ON "LibraryIssue"("bookId", "status");

-- CreateIndex
CREATE INDEX "LibraryIssue_issueDate_status_idx" ON "LibraryIssue"("issueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CertificatePrintLog_certificateNumber_key" ON "CertificatePrintLog"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CertificatePrintLog_verificationCode_key" ON "CertificatePrintLog"("verificationCode");

-- CreateIndex
CREATE INDEX "CertificatePrintLog_studentId_certificateType_issueDate_idx" ON "CertificatePrintLog"("studentId", "certificateType", "issueDate");

-- CreateIndex
CREATE UNIQUE INDEX "ExamStatusRecord_studentId_key" ON "ExamStatusRecord"("studentId");

-- CreateIndex
CREATE INDEX "ExamStatusRecord_practicalExamAppearance_idx" ON "ExamStatusRecord"("practicalExamAppearance");

-- CreateIndex
CREATE INDEX "ExamStatusRecord_tradePracticalResult_practicalEligibleReap_idx" ON "ExamStatusRecord"("tradePracticalResult", "practicalEligibleReappear");

-- CreateIndex
CREATE INDEX "ExamStatusRecord_onlineTheoryResult_theoryEligibleReappear_idx" ON "ExamStatusRecord"("onlineTheoryResult", "theoryEligibleReappear");

-- CreateIndex
CREATE INDEX "ExamStatusRecord_examFeePaid_idx" ON "ExamStatusRecord"("examFeePaid");

-- CreateIndex
CREATE INDEX "ExamStatusRecord_resultPublished_idx" ON "ExamStatusRecord"("resultPublished");

-- CreateIndex
CREATE INDEX "AttendanceRecord_recordDate_personType_idx" ON "AttendanceRecord"("recordDate", "personType");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_studentId_recordDate_key" ON "AttendanceRecord"("studentId", "recordDate");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_staffId_recordDate_key" ON "AttendanceRecord"("staffId", "recordDate");

-- CreateIndex
CREATE INDEX "CommunicationTemplate_category_channel_isActive_idx" ON "CommunicationTemplate"("category", "channel", "isActive");

-- CreateIndex
CREATE INDEX "CommunicationLog_channel_status_createdAt_idx" ON "CommunicationLog"("channel", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CommunicationLog_targetType_targetId_idx" ON "CommunicationLog"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "GrievanceCase_grievanceNo_key" ON "GrievanceCase"("grievanceNo");

-- CreateIndex
CREATE INDEX "GrievanceCase_status_priority_createdAt_idx" ON "GrievanceCase"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "GrievanceCase_targetType_studentId_staffId_idx" ON "GrievanceCase"("targetType", "studentId", "staffId");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementCompany_companyCode_key" ON "PlacementCompany"("companyCode");

-- CreateIndex
CREATE INDEX "PlacementCompany_companyName_isActive_idx" ON "PlacementCompany"("companyName", "isActive");

-- CreateIndex
CREATE INDEX "PlacementRecord_placementStatus_apprenticeshipStatus_create_idx" ON "PlacementRecord"("placementStatus", "apprenticeshipStatus", "createdAt");

-- CreateIndex
CREATE INDEX "PlacementRecord_studentId_companyId_idx" ON "PlacementRecord"("studentId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountEntry_feeTransactionId_key" ON "AccountEntry"("feeTransactionId");

-- CreateIndex
CREATE INDEX "FeeProfile_paymentStatus_idx" ON "FeeProfile"("paymentStatus");

-- CreateIndex
CREATE INDEX "FeeProfile_dueAmount_idx" ON "FeeProfile"("dueAmount");

-- CreateIndex
CREATE UNIQUE INDEX "FeeTransaction_receiptNumber_key" ON "FeeTransaction"("receiptNumber");

-- CreateIndex
CREATE INDEX "PrnScvtRecord_verificationStatus_idx" ON "PrnScvtRecord"("verificationStatus");

-- CreateIndex
CREATE INDEX "PrnScvtRecord_scvtRegistrationNumber_idx" ON "PrnScvtRecord"("scvtRegistrationNumber");

-- CreateIndex
CREATE INDEX "PrnScvtRecord_prnNumber_idx" ON "PrnScvtRecord"("prnNumber");

-- CreateIndex
CREATE INDEX "ScholarshipRecord_status_idx" ON "ScholarshipRecord"("status");

-- CreateIndex
CREATE INDEX "Student_session_status_idx" ON "Student"("session", "status");

-- CreateIndex
CREATE INDEX "Student_session_documentsStatus_idx" ON "Student"("session", "documentsStatus");

-- CreateIndex
CREATE INDEX "Student_session_eligibilityStatus_idx" ON "Student"("session", "eligibilityStatus");

-- CreateIndex
CREATE INDEX "StudentDocument_deletedAt_verificationStatus_idx" ON "StudentDocument"("deletedAt", "verificationStatus");

-- CreateIndex
CREATE INDEX "StudentDocument_createdAt_idx" ON "StudentDocument"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UndertakingRecord_verificationCode_key" ON "UndertakingRecord"("verificationCode");

-- CreateIndex
CREATE INDEX "UndertakingRecord_generationStatus_idx" ON "UndertakingRecord"("generationStatus");

-- CreateIndex
CREATE INDEX "UndertakingRecord_signedStatus_idx" ON "UndertakingRecord"("signedStatus");

-- CreateIndex
CREATE INDEX "UndertakingRecord_signedDocumentUrl_signedStatus_idx" ON "UndertakingRecord"("signedDocumentUrl", "signedStatus");

-- CreateIndex
CREATE INDEX "UndertakingRecord_printCount_idx" ON "UndertakingRecord"("printCount");

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetablePublication" ADD CONSTRAINT "TimetablePublication_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetablePublication" ADD CONSTRAINT "TimetablePublication_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetablePublication" ADD CONSTRAINT "TimetablePublication_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrQualification" ADD CONSTRAINT "HrQualification_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "HrStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPayment" ADD CONSTRAINT "HrPayment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "HrStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPayment" ADD CONSTRAINT "HrPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrLeaveRecord" ADD CONSTRAINT "HrLeaveRecord_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "HrStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrLeaveRecord" ADD CONSTRAINT "HrLeaveRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrLeaveRecord" ADD CONSTRAINT "HrLeaveRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountEntry" ADD CONSTRAINT "AccountEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountDayClosure" ADD CONSTRAINT "AccountDayClosure_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBill" ADD CONSTRAINT "VendorBill_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayment" ADD CONSTRAINT "VendorPayment_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "VendorBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayment" ADD CONSTRAINT "VendorPayment_accountEntryId_fkey" FOREIGN KEY ("accountEntryId") REFERENCES "AccountEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayment" ADD CONSTRAINT "VendorPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentNoDuesClearance" ADD CONSTRAINT "StudentNoDuesClearance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentNoDuesClearance" ADD CONSTRAINT "StudentNoDuesClearance_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryIssue" ADD CONSTRAINT "InventoryIssue_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryIssue" ADD CONSTRAINT "InventoryIssue_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryIssue" ADD CONSTRAINT "InventoryIssue_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryIssue" ADD CONSTRAINT "InventoryIssue_returnedById_fkey" FOREIGN KEY ("returnedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryIssue" ADD CONSTRAINT "LibraryIssue_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibraryBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryIssue" ADD CONSTRAINT "LibraryIssue_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryIssue" ADD CONSTRAINT "LibraryIssue_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryIssue" ADD CONSTRAINT "LibraryIssue_returnedById_fkey" FOREIGN KEY ("returnedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificatePrintLog" ADD CONSTRAINT "CertificatePrintLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificatePrintLog" ADD CONSTRAINT "CertificatePrintLog_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamStatusRecord" ADD CONSTRAINT "ExamStatusRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "HrStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationTemplate" ADD CONSTRAINT "CommunicationTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CommunicationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrievanceCase" ADD CONSTRAINT "GrievanceCase_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrievanceCase" ADD CONSTRAINT "GrievanceCase_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "HrStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrievanceCase" ADD CONSTRAINT "GrievanceCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementCompany" ADD CONSTRAINT "PlacementCompany_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementRecord" ADD CONSTRAINT "PlacementRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementRecord" ADD CONSTRAINT "PlacementRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PlacementCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementRecord" ADD CONSTRAINT "PlacementRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
